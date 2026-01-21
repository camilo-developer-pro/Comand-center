-- Migration: Move Item RPC V2 with Fractional Indexing
-- Version: V2.1
-- Description: O(1) item reordering using fractional index keys

-- ============================================
-- MOVE ITEM RPC V2
-- ============================================

CREATE OR REPLACE FUNCTION move_item_v2(
    p_item_id UUID,
    p_new_parent_id UUID,
    p_prev_sibling_id UUID DEFAULT NULL,  -- Item that should be BEFORE this one
    p_next_sibling_id UUID DEFAULT NULL   -- Item that should be AFTER this one
)
RETURNS JSON AS $$
DECLARE
    v_item RECORD;
    v_old_path ltree;
    v_new_path ltree;
    v_new_parent_path ltree;
    v_new_rank_key TEXT;
    v_path_prefix TEXT;
    v_items_updated INTEGER;
BEGIN
    -- Validate item exists
    SELECT id, path, parent_id, rank_key
    INTO v_item
    FROM public.items
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Item not found'
        );
    END IF;
    
    v_old_path := v_item.path;
    
    -- Get new parent's path (or root if NULL)
    IF p_new_parent_id IS NOT NULL THEN
        SELECT path INTO v_new_parent_path
        FROM public.items
        WHERE id = p_new_parent_id;
        
        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', false,
                'error', 'New parent not found'
            );
        END IF;
    ELSE
        -- Root level path prefix is usually 'root' in this project
        v_new_parent_path := 'root'::ltree;
    END IF;
    
    -- Prevent moving item into its own subtree
    IF p_new_parent_id IS NOT NULL AND v_new_parent_path <@ v_old_path THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot move item into its own subtree'
        );
    END IF;
    
    -- Generate new rank_key using fractional indexing
    v_new_rank_key := generate_item_rank_key(
        p_new_parent_id,
        p_prev_sibling_id,
        p_next_sibling_id
    );
    
    -- Calculate new path for the moved item
    -- New path = new_parent_path || item_id_as_label
    -- We use a standardized label 'item_' + clean ID to ensure ltree compatibility
    v_path_prefix := 'item_' || REPLACE(p_item_id::TEXT, '-', '_');
    
    IF v_new_parent_path IS NOT NULL THEN
        v_new_path := v_new_parent_path || v_path_prefix::ltree;
    ELSE
        v_new_path := v_path_prefix::ltree;
    END IF;
    
    -- Begin atomic update
    -- Update the item itself
    UPDATE public.items
    SET 
        parent_id = p_new_parent_id,
        path = v_new_path,
        rank_key = v_new_rank_key,
        updated_at = NOW()
    WHERE id = p_item_id;
    
    -- Update all descendants' paths
    -- Replace old path prefix with new path prefix
    UPDATE public.items
    SET 
        path = v_new_path || subpath(path, nlevel(v_old_path)),
        updated_at = NOW()
    WHERE path <@ v_old_path AND id != p_item_id;
    
    GET DIAGNOSTICS v_items_updated = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'item_id', p_item_id,
        'new_parent_id', p_new_parent_id,
        'new_rank_key', v_new_rank_key,
        'new_path', v_new_path::TEXT,
        'descendants_updated', v_items_updated
    );
    
EXCEPTION WHEN unique_violation THEN
    -- Handle rare rank_key collision
    RETURN json_build_object(
        'success', false,
        'error', 'Rank key collision - retry operation',
        'retry', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REORDER WITHIN SAME PARENT (Convenience)
-- ============================================

CREATE OR REPLACE FUNCTION reorder_item(
    p_item_id UUID,
    p_prev_sibling_id UUID DEFAULT NULL,
    p_next_sibling_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_parent_id UUID;
BEGIN
    -- Get current parent (no parent change)
    SELECT parent_id INTO v_parent_id
    FROM public.items
    WHERE id = p_item_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Item not found'
        );
    END IF;
    
    -- Use move_item_v2 with same parent
    RETURN move_item_v2(
        p_item_id,
        v_parent_id,
        p_prev_sibling_id,
        p_next_sibling_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INSERT NEW ITEM WITH POSITION
-- ============================================

CREATE OR REPLACE FUNCTION insert_item_at_position(
    p_workspace_id UUID,
    p_parent_id UUID,
    p_name TEXT,
    p_item_type item_type DEFAULT 'document',
    p_prev_sibling_id UUID DEFAULT NULL,
    p_next_sibling_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_new_id UUID;
    v_new_path ltree;
    v_parent_path ltree;
    v_rank_key TEXT;
    v_path_label TEXT;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Generate new ID
    v_new_id := gen_random_uuid();
    v_path_label := 'item_' || REPLACE(v_new_id::TEXT, '-', '_');
    
    -- Get parent path
    IF p_parent_id IS NOT NULL THEN
        SELECT path INTO v_parent_path
        FROM public.items
        WHERE id = p_parent_id;
        
        v_new_path := v_parent_path || v_path_label::ltree;
    ELSE
        v_new_path := 'root'::ltree || v_path_label::ltree;
    END IF;
    
    -- Generate rank key for position
    v_rank_key := generate_item_rank_key(
        p_parent_id,
        p_prev_sibling_id,
        p_next_sibling_id
    );
    
    -- Insert the item
    INSERT INTO public.items (
        id,
        workspace_id,
        parent_id,
        name,
        item_type,
        path,
        rank_key,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_new_id,
        p_workspace_id,
        p_parent_id,
        p_name,
        p_item_type,
        v_new_path,
        v_rank_key,
        COALESCE(v_user_id, (SELECT id FROM auth.users LIMIT 1)),
        NOW(),
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'id', v_new_id,
        'path', v_new_path::TEXT,
        'rank_key', v_rank_key
    );
    
EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Rank key collision or duplicate name',
        'retry', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION move_item_v2 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reorder_item TO authenticated, anon;
GRANT EXECUTE ON FUNCTION insert_item_at_position TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_item_rank_key TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_generate_key_between TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_get_alphabet TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_char_at TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_index_of TO authenticated, anon;
