-- ============================================================================
-- Migration: 00011_move_item_subtree_function.sql
-- Description: Secure function for moving items and descendants in ltree hierarchy
-- Version: 2.0
-- Author: Command Center ERP Team
-- Date: 2026-01-21
-- ============================================================================
-- This migration implements a secure, atomic function for moving items
-- (folders or documents) and all their descendants to a new parent location
-- within the hierarchical file system. Includes cycle detection and RLS.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Helper Function - Get Descendants Count
-- ============================================================================
-- Returns the count of all descendants of a given item.
-- Uses the ltree <@ operator for efficient descendant queries.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_item_descendants_count(p_item_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item_path ltree;
    descendant_count INTEGER;
BEGIN
    -- Get the path of the target item
    SELECT path INTO item_path
    FROM items
    WHERE id = p_item_id;
    
    -- If item not found, return 0
    IF item_path IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count all descendants using ltree <@ operator
    -- <@ means "is descendant of" (path is under item_path)
    SELECT COUNT(*) INTO descendant_count
    FROM items
    WHERE path <@ item_path
    AND path != item_path;  -- Exclude the item itself
    
    RETURN descendant_count;
END;
$$;

-- ============================================================================
-- SECTION 2: Core Move Item Subtree Function
-- ============================================================================
-- Moves an item and all its descendants to a new parent location.
-- This is the internal function that performs the actual move operation.
-- ============================================================================

CREATE OR REPLACE FUNCTION move_item_subtree(
    p_item_id UUID,
    p_new_parent_id UUID,  -- NULL means move to root level
    p_workspace_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Item variables
    v_item_record RECORD;
    v_current_path ltree;
    v_current_name TEXT;
    
    -- Parent variables
    v_new_parent_record RECORD;
    v_new_parent_path ltree;
    
    -- Path calculation variables
    v_old_path_prefix ltree;
    v_new_path_prefix ltree;
    v_new_path_segment TEXT;
    v_final_new_path ltree;
    
    -- Result variables
    v_descendants_moved INTEGER;
    v_result jsonb;
BEGIN
    -- ========================================================================
    -- STEP 1: Validate Input - Verify Item Exists
    -- ========================================================================
    SELECT id, name, path, item_type, workspace_id
    INTO v_item_record
    FROM items
    WHERE id = p_item_id
    AND workspace_id = p_workspace_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found in specified workspace (item_id: %, workspace_id: %)', 
            p_item_id, p_workspace_id;
    END IF;
    
    v_current_path := v_item_record.path;
    v_current_name := v_item_record.name;
    
    -- ========================================================================
    -- STEP 2: Handle Root Level Move (p_new_parent_id IS NULL)
    -- ========================================================================
    IF p_new_parent_id IS NULL THEN
        -- Moving to root level
        v_new_parent_path := 'root'::ltree;
        
        -- Generate new path segment for root level
        v_new_path_segment := generate_path_segment(v_current_name);
        v_new_path_prefix := v_new_parent_path || v_new_path_segment::ltree;
        
        -- Check for path collision at root level
        IF EXISTS (
            SELECT 1 FROM items 
            WHERE workspace_id = p_workspace_id 
            AND path = v_new_path_prefix
            AND id != p_item_id
        ) THEN
            -- Append timestamp suffix to avoid collision
            v_new_path_segment := v_new_path_segment || '_' || 
                EXTRACT(EPOCH FROM NOW())::TEXT;
            v_new_path_prefix := v_new_parent_path || v_new_path_segment::ltree;
        END IF;
        
    ELSE
        -- ====================================================================
        -- STEP 3: Validate New Parent
        -- ====================================================================
        SELECT id, name, path, item_type, workspace_id
        INTO v_new_parent_record
        FROM items
        WHERE id = p_new_parent_id
        AND workspace_id = p_workspace_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'New parent not found in specified workspace (parent_id: %, workspace_id: %)', 
                p_new_parent_id, p_workspace_id;
        END IF;
        
        -- Verify new parent is a folder
        IF v_new_parent_record.item_type != 'folder' THEN
            RAISE EXCEPTION 'New parent must be a folder (parent_id: %, type: %)', 
                p_new_parent_id, v_new_parent_record.item_type;
        END IF;
        
        v_new_parent_path := v_new_parent_record.path;
        
        -- ====================================================================
        -- STEP 4: CRITICAL - Cycle Detection
        -- ====================================================================
        -- Check if new parent is a descendant of the item being moved
        -- Using ltree <@ operator: "is descendant of"
        -- If new_parent_path is under current_path, we have a cycle
        IF v_new_parent_path <@ v_current_path THEN
            RAISE EXCEPTION 'Cannot move folder into its own descendant (cycle detected). Item path: %, New parent path: %',
                v_current_path, v_new_parent_path;
        END IF;
        
        -- ====================================================================
        -- STEP 5: Calculate New Path
        -- ====================================================================
        v_new_path_segment := generate_path_segment(v_current_name);
        v_new_path_prefix := v_new_parent_path || v_new_path_segment::ltree;
        
        -- Check for path collision
        IF EXISTS (
            SELECT 1 FROM items 
            WHERE workspace_id = p_workspace_id 
            AND path = v_new_path_prefix
            AND id != p_item_id
        ) THEN
            -- Append timestamp suffix to avoid collision
            v_new_path_segment := v_new_path_segment || '_' || 
                EXTRACT(EPOCH FROM NOW())::TEXT;
            v_new_path_prefix := v_new_parent_path || v_new_path_segment::ltree;
        END IF;
    END IF;
    
    -- ========================================================================
    -- STEP 6: Atomic Subtree Update
    -- ========================================================================
    -- Update the item and ALL its descendants in a single atomic operation
    -- Using ltree path arithmetic to recalculate all descendant paths
    
    v_old_path_prefix := v_current_path;
    
    -- The UPDATE uses ltree operators:
    -- - <@ : "is descendant of" operator
    -- - || : concatenation operator
    -- - subpath(path, start) : extracts portion of path from start position
    -- - nlevel(path) : returns the depth level of the path
    
    UPDATE items
    SET 
        -- Recalculate path: new_prefix + relative_path_from_old_prefix
        path = v_new_path_prefix || subpath(path, nlevel(v_old_path_prefix)),
        
        -- Update parent_id only for the item being moved
        parent_id = CASE 
            WHEN id = p_item_id THEN p_new_parent_id
            ELSE parent_id 
        END,
        
        -- Update timestamp
        updated_at = NOW()
    WHERE 
        workspace_id = p_workspace_id
        AND (
            path = v_old_path_prefix  -- The item itself
            OR path <@ v_old_path_prefix  -- All descendants
        );
    
    -- Get count of descendants moved (excluding the item itself)
    v_descendants_moved := get_item_descendants_count(p_item_id);
    
    -- ========================================================================
    -- STEP 7: Return Result as JSONB
    -- ========================================================================
    v_result := jsonb_build_object(
        'success', true,
        'item_id', p_item_id,
        'item_name', v_current_name,
        'old_path', v_current_path::text,
        'new_path', v_new_path_prefix::text,
        'descendants_moved', v_descendants_moved,
        'new_parent_id', p_new_parent_id,
        'workspace_id', p_workspace_id
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception with context
        RAISE EXCEPTION 'move_item_subtree failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- SECTION 3: Secure Wrapper Function with RLS
-- ============================================================================
-- This is the public-facing function that enforces Row Level Security.
-- It verifies the user has access to the workspace before calling the
-- internal move function.
-- ============================================================================

CREATE OR REPLACE FUNCTION move_item_subtree_secure(
    p_item_id UUID,
    p_new_parent_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_user_id UUID;
    v_has_access BOOLEAN;
    v_result jsonb;
BEGIN
    -- Get current user ID from auth context
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get workspace_id from the item
    SELECT workspace_id INTO v_workspace_id
    FROM items
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found (item_id: %)', p_item_id;
    END IF;
    
    -- Verify user has access to this workspace
    SELECT EXISTS (
        SELECT 1
        FROM workspace_members
        WHERE workspace_id = v_workspace_id
        AND user_id = v_user_id
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Access denied: User does not have access to workspace (workspace_id: %)', 
            v_workspace_id;
    END IF;
    
    -- If new_parent_id is provided, verify it's in the same workspace
    IF p_new_parent_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM items
            WHERE id = p_new_parent_id
            AND workspace_id = v_workspace_id
        ) THEN
            RAISE EXCEPTION 'New parent must be in the same workspace';
        END IF;
    END IF;
    
    -- Call the internal move function
    v_result := move_item_subtree(p_item_id, p_new_parent_id, v_workspace_id);
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'move_item_subtree_secure failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- SECTION 4: Function Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION get_item_descendants_count(UUID) IS 
'Returns the count of all descendants of a given item using ltree <@ operator';

COMMENT ON FUNCTION move_item_subtree(UUID, UUID, UUID) IS 
'Internal function to move an item and all descendants to a new parent. Includes cycle detection and atomic path updates.';

COMMENT ON FUNCTION move_item_subtree_secure(UUID, UUID) IS 
'Secure wrapper for move_item_subtree that enforces RLS and workspace access control. Use this function from application code.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

/*
-- ============================================================================
-- SECTION 5: TEST CASES (Commented - Uncomment to Run Tests)
-- ============================================================================
-- These test cases verify the function works correctly.
-- Run these in a test environment, not production.
-- ============================================================================

-- TEST SETUP: Create test folder structure
-- ============================================================================
DO $$
DECLARE
    v_workspace_id UUID;
    v_user_id UUID;
    v_root_folder UUID;
    v_folder_a UUID;
    v_folder_b UUID;
    v_subfolder_a1 UUID;
    v_doc_1 UUID;
    v_doc_2 UUID;
BEGIN
    -- Get or create test workspace and user
    SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    -- Create folder structure:
    -- root
    -- ├── Folder A
    -- │   ├── Subfolder A1
    -- │   │   └── Document 1
    -- └── Folder B
    --     └── Document 2
    
    -- Create Folder A
    INSERT INTO items (name, item_type, path, workspace_id, created_by, parent_id)
    VALUES ('Folder A', 'folder', 'root.item_folder_a_test1'::ltree, v_workspace_id, v_user_id, NULL)
    RETURNING id INTO v_folder_a;
    
    -- Create Folder B
    INSERT INTO items (name, item_type, path, workspace_id, created_by, parent_id)
    VALUES ('Folder B', 'folder', 'root.item_folder_b_test1'::ltree, v_workspace_id, v_user_id, NULL)
    RETURNING id INTO v_folder_b;
    
    -- Create Subfolder A1 under Folder A
    INSERT INTO items (name, item_type, path, workspace_id, created_by, parent_id)
    VALUES ('Subfolder A1', 'folder', 'root.item_folder_a_test1.item_subfolder_a1_test1'::ltree, 
            v_workspace_id, v_user_id, v_folder_a)
    RETURNING id INTO v_subfolder_a1;
    
    -- Create Document 1 under Subfolder A1
    INSERT INTO documents (title, workspace_id, created_by)
    VALUES ('Document 1', v_workspace_id, v_user_id)
    RETURNING id INTO v_doc_1;
    
    INSERT INTO items (name, item_type, path, workspace_id, created_by, document_id, parent_id)
    VALUES ('Document 1', 'document', 
            'root.item_folder_a_test1.item_subfolder_a1_test1.item_document_1_test1'::ltree,
            v_workspace_id, v_user_id, v_doc_1, v_subfolder_a1);
    
    -- Create Document 2 under Folder B
    INSERT INTO documents (title, workspace_id, created_by)
    VALUES ('Document 2', v_workspace_id, v_user_id)
    RETURNING id INTO v_doc_2;
    
    INSERT INTO items (name, item_type, path, workspace_id, created_by, document_id, parent_id)
    VALUES ('Document 2', 'document', 
            'root.item_folder_b_test1.item_document_2_test1'::ltree,
            v_workspace_id, v_user_id, v_doc_2, v_folder_b);
    
    RAISE NOTICE 'Test structure created successfully';
    RAISE NOTICE 'Folder A ID: %', v_folder_a;
    RAISE NOTICE 'Folder B ID: %', v_folder_b;
    RAISE NOTICE 'Subfolder A1 ID: %', v_subfolder_a1;
END $$;

-- TEST 1: Attempt to move parent into child (should fail with cycle detection)
-- ============================================================================
DO $$
DECLARE
    v_folder_a UUID;
    v_subfolder_a1 UUID;
    v_workspace_id UUID;
    v_result jsonb;
BEGIN
    SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
    
    -- Get Folder A and Subfolder A1 IDs
    SELECT id INTO v_folder_a FROM items 
    WHERE name = 'Folder A' AND workspace_id = v_workspace_id LIMIT 1;
    
    SELECT id INTO v_subfolder_a1 FROM items 
    WHERE name = 'Subfolder A1' AND workspace_id = v_workspace_id LIMIT 1;
    
    -- Try to move Folder A into Subfolder A1 (should fail)
    BEGIN
        v_result := move_item_subtree(v_folder_a, v_subfolder_a1, v_workspace_id);
        RAISE EXCEPTION 'TEST FAILED: Cycle detection did not work!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%cycle detected%' THEN
                RAISE NOTICE 'TEST PASSED: Cycle detection worked correctly';
            ELSE
                RAISE EXCEPTION 'TEST FAILED: Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;

-- TEST 2: Move Subfolder A1 to Folder B (should succeed)
-- ============================================================================
DO $$
DECLARE
    v_subfolder_a1 UUID;
    v_folder_b UUID;
    v_workspace_id UUID;
    v_result jsonb;
    v_new_path TEXT;
    v_descendants_moved INTEGER;
BEGIN
    SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
    
    -- Get IDs
    SELECT id INTO v_subfolder_a1 FROM items 
    WHERE name = 'Subfolder A1' AND workspace_id = v_workspace_id LIMIT 1;
    
    SELECT id INTO v_folder_b FROM items 
    WHERE name = 'Folder B' AND workspace_id = v_workspace_id LIMIT 1;
    
    -- Move Subfolder A1 to Folder B
    v_result := move_item_subtree(v_subfolder_a1, v_folder_b, v_workspace_id);
    
    v_new_path := v_result->>'new_path';
    v_descendants_moved := (v_result->>'descendants_moved')::INTEGER;
    
    RAISE NOTICE 'TEST PASSED: Move succeeded';
    RAISE NOTICE 'Result: %', v_result;
    RAISE NOTICE 'New path: %', v_new_path;
    RAISE NOTICE 'Descendants moved: %', v_descendants_moved;
    
    -- Verify the path starts with Folder B's path
    IF v_new_path LIKE 'root.item_folder_b%' THEN
        RAISE NOTICE 'TEST PASSED: Path updated correctly';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: Path not updated correctly';
    END IF;
END $$;

-- TEST 3: Verify all descendant paths updated correctly
-- ============================================================================
DO $$
DECLARE
    v_workspace_id UUID;
    v_doc_1_path TEXT;
BEGIN
    SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
    
    -- Check Document 1's path (should now be under Folder B)
    SELECT path::text INTO v_doc_1_path FROM items 
    WHERE name = 'Document 1' AND workspace_id = v_workspace_id LIMIT 1;
    
    RAISE NOTICE 'Document 1 path: %', v_doc_1_path;
    
    IF v_doc_1_path LIKE 'root.item_folder_b%' THEN
        RAISE NOTICE 'TEST PASSED: Descendant paths updated correctly';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: Descendant paths not updated';
    END IF;
END $$;

-- TEST 4: Move to root level (parent_id = NULL)
-- ============================================================================
DO $$
DECLARE
    v_folder_b UUID;
    v_workspace_id UUID;
    v_result jsonb;
    v_new_path TEXT;
BEGIN
    SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;
    
    SELECT id INTO v_folder_b FROM items 
    WHERE name = 'Folder B' AND workspace_id = v_workspace_id LIMIT 1;
    
    -- Move Folder B to root level
    v_result := move_item_subtree(v_folder_b, NULL, v_workspace_id);
    
    v_new_path := v_result->>'new_path';
    
    RAISE NOTICE 'TEST PASSED: Root level move succeeded';
    RAISE NOTICE 'New path: %', v_new_path;
    
    IF v_new_path LIKE 'root.item_%' AND v_new_path NOT LIKE 'root.%.%' THEN
        RAISE NOTICE 'TEST PASSED: Item moved to root level correctly';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: Item not at root level';
    END IF;
END $$;

-- CLEANUP: Remove test data
-- ============================================================================
-- Uncomment to clean up test data
-- DELETE FROM items WHERE name LIKE '%test1%';

*/
