-- ============================================================================
-- Migration: 00010_hierarchical_items_ltree.sql
-- Description: Hierarchical File System using PostgreSQL ltree Extension
-- Version: 2.0
-- Author: Command Center ERP Team
-- Date: 2026-01-21
-- ============================================================================
-- This migration implements a hierarchical file system that supports both
-- documents and folders using PostgreSQL's ltree extension for efficient
-- path-based queries and subtree operations.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Enable ltree Extension
-- ============================================================================
-- The ltree extension provides a data type for representing labels of data
-- stored in a hierarchical tree-like structure.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================================================
-- SECTION 2: Create ENUM for Item Type
-- ============================================================================
-- Define the types of items that can exist in the hierarchy.
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('folder', 'document');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3: Create items Table
-- ============================================================================
-- The items table serves as the unified abstraction layer for the file system.
-- It supports both folders and documents in a single hierarchical structure.
-- ============================================================================

CREATE TABLE IF NOT EXISTS items (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Display name of the item
    name TEXT NOT NULL,
    
    -- Type of item (folder or document)
    item_type item_type NOT NULL DEFAULT 'document',
    
    -- Materialized path using ltree
    -- Format: 'root.segment1.segment2.segment3'
    -- This enables efficient ancestor/descendant queries
    path ltree NOT NULL,
    
    -- Workspace association (multi-tenancy)
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Creator/owner of the item
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Reference to actual document (nullable, only for type='document')
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Parent item reference (nullable, null = root level)
    -- Maintained for referential integrity and easier parent lookups
    parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
    
    -- Manual ordering within siblings (for drag-and-drop)
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================
    
    -- Ensure unique paths within a workspace (no duplicate paths)
    CONSTRAINT unique_workspace_path UNIQUE(workspace_id, path),
    
    -- Folders must NOT have a document_id
    CONSTRAINT folder_no_document CHECK (
        item_type != 'folder' OR document_id IS NULL
    ),
    
    -- Documents must HAVE a document_id
    CONSTRAINT document_requires_document_id CHECK (
        item_type != 'document' OR document_id IS NOT NULL
    ),
    
    -- Validate ltree path format (alphanumeric and underscores only)
    CONSTRAINT valid_path_format CHECK (
        path::text ~ '^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$'
    )
);

-- ============================================================================
-- SECTION 4: Create Indexes for Performance
-- ============================================================================
-- GiST index enables efficient ltree operations (@>, <@, etc.)
-- B-tree indexes for standard lookups and foreign key performance
-- ============================================================================

-- GiST index for ltree path operations (ancestor/descendant queries)
CREATE INDEX IF NOT EXISTS idx_items_path_gist 
    ON items USING GIST (path);

-- B-tree index for path text operations and sorting
CREATE INDEX IF NOT EXISTS idx_items_path_btree 
    ON items USING BTREE (path);

-- Index for workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_items_workspace 
    ON items(workspace_id);

-- Index for parent lookups
CREATE INDEX IF NOT EXISTS idx_items_parent 
    ON items(parent_id);

-- Index for document reference lookups
CREATE INDEX IF NOT EXISTS idx_items_document 
    ON items(document_id) WHERE document_id IS NOT NULL;

-- Composite index for workspace + type queries
CREATE INDEX IF NOT EXISTS idx_items_workspace_type 
    ON items(workspace_id, item_type);

-- Index for sort order within parent
CREATE INDEX IF NOT EXISTS idx_items_parent_sort 
    ON items(parent_id, sort_order);

-- ============================================================================
-- SECTION 5: Helper Function to Generate Path Segment
-- ============================================================================
-- This function creates URL-safe, unique path segments from item names.
-- It ensures compatibility with ltree requirements and prevents collisions.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_path_segment(item_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned_name TEXT;
    random_suffix TEXT;
    final_segment TEXT;
BEGIN
    -- Convert to lowercase
    cleaned_name := LOWER(item_name);
    
    -- Replace spaces with underscores
    cleaned_name := REPLACE(cleaned_name, ' ', '_');
    
    -- Remove non-alphanumeric characters (except underscores)
    cleaned_name := REGEXP_REPLACE(cleaned_name, '[^a-z0-9_]', '', 'g');
    
    -- Truncate to reasonable length (ltree labels max 256 chars)
    cleaned_name := LEFT(cleaned_name, 50);
    
    -- Handle empty string case
    IF cleaned_name = '' OR cleaned_name IS NULL THEN
        cleaned_name := 'item';
    END IF;
    
    -- Generate 4-character random suffix for uniqueness
    -- Using alphanumeric characters only
    random_suffix := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 4));
    
    -- Prepend 'item_' prefix to avoid ltree reserved words
    -- Append random suffix to ensure uniqueness
    final_segment := 'item_' || cleaned_name || '_' || random_suffix;
    
    RETURN final_segment;
END;
$$;

-- ============================================================================
-- SECTION 6: Backfill Function for Existing Documents
-- ============================================================================
-- This function migrates all existing documents from the flat structure
-- to the new hierarchical items table. All existing documents are placed
-- at the root level of their respective workspaces.
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_existing_documents()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    doc_record RECORD;
    doc_count INTEGER := 0;
    item_name TEXT;
    item_path TEXT;
    path_segment TEXT;
BEGIN
    -- Iterate over all documents that don't have an entry in items table
    FOR doc_record IN 
        SELECT d.id, d.title, d.workspace_id, d.created_by, d.created_at
        FROM documents d
        LEFT JOIN items i ON i.document_id = d.id
        WHERE i.id IS NULL
    LOOP
        -- Use document title or 'Untitled' if null/empty
        item_name := COALESCE(NULLIF(TRIM(doc_record.title), ''), 'Untitled');
        
        -- Generate unique path segment
        path_segment := generate_path_segment(item_name);
        
        -- Create root-level path with document ID for additional uniqueness
        item_path := 'root.' || path_segment || '_' || LEFT(doc_record.id::TEXT, 8);
        
        -- Insert into items table
        INSERT INTO items (
            name,
            item_type,
            path,
            workspace_id,
            created_by,
            document_id,
            parent_id,
            sort_order,
            created_at,
            updated_at
        ) VALUES (
            item_name,
            'document',
            item_path::ltree,
            doc_record.workspace_id,
            doc_record.created_by,
            doc_record.id,
            NULL, -- Root level (no parent)
            doc_count, -- Use count as initial sort order
            doc_record.created_at,
            NOW()
        );
        
        doc_count := doc_count + 1;
    END LOOP;
    
    -- Return the count of migrated documents
    RETURN doc_count;
END;
$$;

-- ============================================================================
-- SECTION 7: Execute Backfill
-- ============================================================================
-- Run the backfill function to migrate existing documents.
-- This is safe to run multiple times (idempotent).
-- ============================================================================

DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT backfill_existing_documents() INTO migrated_count;
    RAISE NOTICE 'Migrated % existing documents to items table', migrated_count;
END $$;

-- ============================================================================
-- SECTION 8: Trigger for New Documents
-- ============================================================================
-- Automatically create an items entry when a new document is created.
-- This ensures the items table stays in sync with the documents table.
-- ============================================================================

-- Trigger function
CREATE OR REPLACE FUNCTION on_document_created_create_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_name TEXT;
    item_path TEXT;
    path_segment TEXT;
BEGIN
    -- Only create item if one doesn't already exist for this document
    IF NOT EXISTS (SELECT 1 FROM items WHERE document_id = NEW.id) THEN
        -- Use document title or 'Untitled'
        item_name := COALESCE(NULLIF(TRIM(NEW.title), ''), 'Untitled');
        
        -- Generate unique path segment
        path_segment := generate_path_segment(item_name);
        
        -- Create root-level path
        item_path := 'root.' || path_segment || '_' || LEFT(NEW.id::TEXT, 8);
        
        -- Insert into items table
        INSERT INTO items (
            name,
            item_type,
            path,
            workspace_id,
            created_by,
            document_id,
            parent_id,
            sort_order,
            created_at,
            updated_at
        ) VALUES (
            item_name,
            'document',
            item_path::ltree,
            NEW.workspace_id,
            NEW.created_by,
            NEW.id,
            NULL,
            0,
            NEW.created_at,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_document_created ON documents;
CREATE TRIGGER on_document_created
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION on_document_created_create_item();

-- ============================================================================
-- SECTION 9: Updated At Trigger for items Table
-- ============================================================================
-- Automatically update the updated_at timestamp when an item is modified.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_items_updated_at_trigger ON items;
CREATE TRIGGER update_items_updated_at_trigger
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_items_updated_at();

-- ============================================================================
-- SECTION 10: Row Level Security (RLS) Policies for items Table
-- ============================================================================
-- Enforce workspace-based access control for the items table.
-- Users can only access items in workspaces they belong to.
-- ============================================================================

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policy: Users can view items in their workspaces
-- ============================================================================
CREATE POLICY items_select_policy ON items
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- INSERT Policy: Users can create items in their workspaces
-- ============================================================================
CREATE POLICY items_insert_policy ON items
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- UPDATE Policy: Users can update items in their workspaces
-- ============================================================================
CREATE POLICY items_update_policy ON items
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- DELETE Policy: Users can delete items they created OR if they are admin/owner
-- ============================================================================
CREATE POLICY items_delete_policy ON items
    FOR DELETE
    USING (
        -- User created the item
        created_by = auth.uid()
        OR
        -- User is admin or owner of the workspace
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- ============================================================================
-- SECTION 11: Helper Functions for Hierarchy Operations
-- ============================================================================
-- Utility functions for common ltree operations
-- ============================================================================

-- ============================================================================
-- Function: Get all descendants of an item
-- ============================================================================
CREATE OR REPLACE FUNCTION get_item_descendants(item_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    item_type item_type,
    path ltree,
    depth INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_path ltree;
BEGIN
    -- Get the path of the target item
    SELECT i.path INTO item_path
    FROM items i
    WHERE i.id = item_id;
    
    -- Return all descendants
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.item_type,
        i.path,
        nlevel(i.path) - nlevel(item_path) AS depth
    FROM items i
    WHERE i.path <@ item_path  -- <@ is "is descendant of" operator
    AND i.path != item_path    -- Exclude the item itself
    ORDER BY i.path;
END;
$$;

-- ============================================================================
-- Function: Get all ancestors of an item (breadcrumb trail)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_item_ancestors(item_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    item_type item_type,
    path ltree,
    level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_path ltree;
BEGIN
    -- Get the path of the target item
    SELECT i.path INTO item_path
    FROM items i
    WHERE i.id = item_id;
    
    -- Return all ancestors
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.item_type,
        i.path,
        nlevel(i.path) AS level
    FROM items i
    WHERE item_path <@ i.path  -- item_path is descendant of i.path
    AND i.path != item_path    -- Exclude the item itself
    ORDER BY i.path;
END;
$$;

-- ============================================================================
-- Function: Move item and all descendants to new parent
-- ============================================================================
CREATE OR REPLACE FUNCTION move_item_subtree(
    target_item_id UUID,
    new_parent_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_path ltree;
    new_parent_path ltree;
    new_full_path ltree;
    target_workspace_id UUID;
    parent_workspace_id UUID;
BEGIN
    -- Get current path and workspace of target item
    SELECT path, workspace_id INTO old_path, target_workspace_id
    FROM items
    WHERE id = target_item_id;
    
    IF old_path IS NULL THEN
        RAISE EXCEPTION 'Item not found: %', target_item_id;
    END IF;
    
    -- Handle root level move (new_parent_id is NULL)
    IF new_parent_id IS NULL THEN
        -- Moving to root level - keep same path structure but update parent_id
        UPDATE items
        SET parent_id = NULL,
            updated_at = NOW()
        WHERE id = target_item_id;
        RETURN;
    END IF;
    
    -- Get new parent path and workspace
    SELECT path, workspace_id INTO new_parent_path, parent_workspace_id
    FROM items
    WHERE id = new_parent_id;
    
    IF new_parent_path IS NULL THEN
        RAISE EXCEPTION 'Parent item not found: %', new_parent_id;
    END IF;
    
    -- Ensure both items are in the same workspace
    IF target_workspace_id != parent_workspace_id THEN
        RAISE EXCEPTION 'Cannot move item across workspaces';
    END IF;
    
    -- Prevent moving an item into its own subtree (cycle detection)
    IF new_parent_path <@ old_path THEN
        RAISE EXCEPTION 'Cannot move item into its own subtree';
    END IF;
    
    -- Calculate new path: parent_path + last segment of old path
    new_full_path := new_parent_path || subpath(old_path, nlevel(old_path) - 1, 1);
    
    -- Update all descendants using ltree path arithmetic
    -- The <@ operator efficiently finds all descendants
    UPDATE items
    SET path = new_full_path || subpath(path, nlevel(old_path)),
        parent_id = CASE 
            WHEN id = target_item_id THEN new_parent_id
            ELSE parent_id
        END,
        updated_at = NOW()
    WHERE path <@ old_path;  -- Includes the item itself and all descendants
    
END;
$$;

-- ============================================================================
-- Function: Get immediate children of an item
-- ============================================================================
CREATE OR REPLACE FUNCTION get_item_children(item_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    item_type item_type,
    path ltree,
    sort_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.item_type,
        i.path,
        i.sort_order
    FROM items i
    WHERE i.parent_id = item_id
    ORDER BY i.sort_order, i.name;
END;
$$;

-- ============================================================================
-- SECTION 12: Comments for Documentation
-- ============================================================================

COMMENT ON TABLE items IS 'Hierarchical file system table supporting both folders and documents using ltree for efficient path-based queries';
COMMENT ON COLUMN items.path IS 'Materialized path using ltree extension. Format: root.segment1.segment2. Enables O(1) ancestor/descendant lookups';
COMMENT ON COLUMN items.parent_id IS 'Direct parent reference maintained for referential integrity and simpler parent lookups';
COMMENT ON COLUMN items.sort_order IS 'Manual ordering within siblings. Use fractional indexing for drag-and-drop operations';
COMMENT ON FUNCTION generate_path_segment(TEXT) IS 'Generates URL-safe, unique ltree path segments from item names';
COMMENT ON FUNCTION backfill_existing_documents() IS 'One-time migration function to move existing documents into items hierarchy';
COMMENT ON FUNCTION move_item_subtree(UUID, UUID) IS 'Atomically moves an item and all its descendants to a new parent. Includes cycle detection';
COMMENT ON FUNCTION get_item_descendants(UUID) IS 'Returns all descendants of an item with depth information';
COMMENT ON FUNCTION get_item_ancestors(UUID) IS 'Returns breadcrumb trail (all ancestors) of an item';
COMMENT ON FUNCTION get_item_children(UUID) IS 'Returns immediate children of an item, ordered by sort_order';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

/*
-- ============================================================================
-- ROLLBACK SECTION (Uncomment to reverse this migration)
-- ============================================================================
-- WARNING: This will permanently delete the items table and all hierarchy data.
-- Make sure to backup your data before running this rollback.
-- ============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS on_document_created ON documents;
DROP TRIGGER IF EXISTS update_items_updated_at_trigger ON items;

-- Drop functions
DROP FUNCTION IF EXISTS on_document_created_create_item();
DROP FUNCTION IF EXISTS update_items_updated_at();
DROP FUNCTION IF EXISTS get_item_children(UUID);
DROP FUNCTION IF EXISTS get_item_ancestors(UUID);
DROP FUNCTION IF EXISTS get_item_descendants(UUID);
DROP FUNCTION IF EXISTS move_item_subtree(UUID, UUID);
DROP FUNCTION IF EXISTS backfill_existing_documents();
DROP FUNCTION IF EXISTS generate_path_segment(TEXT);

-- Drop table (this will cascade to all dependent objects)
DROP TABLE IF EXISTS items CASCADE;

-- Drop type
DROP TYPE IF EXISTS item_type;

-- Drop extension (only if not used by other tables)
-- DROP EXTENSION IF EXISTS ltree;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
*/
