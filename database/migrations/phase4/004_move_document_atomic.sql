-- ============================================================================
-- Command Center V3.1 - Phase 4: Atomic Document Moves
-- Migration: 004_move_document_atomic
-- ============================================================================

CREATE OR REPLACE FUNCTION move_document_atomic(
    p_document_id UUID,
    p_new_parent_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_path ltree;
    v_new_parent_path ltree;
    v_new_path ltree;
    v_path_segment TEXT;
BEGIN
    -- 1. Start TRANSACTION (implicit)
    
    -- 2. Lock the target row and get current path
    SELECT path INTO v_old_path 
    FROM public.documents 
    WHERE id = p_document_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document % not found', p_document_id;
    END IF;

    -- 3. Lock and get the new parent's path
    IF p_new_parent_id IS NULL THEN
        v_new_parent_path := 'root'::ltree;
    ELSE
        SELECT path INTO v_new_parent_path 
        FROM public.documents 
        WHERE id = p_new_parent_id 
        FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent document % not found', p_new_parent_id;
        END IF;
    END IF;

    -- 4. Calculate the new path prefix for the document
    -- We use 'doc_' prefix + stripped UUID for ltree compatibility
    v_path_segment := 'doc_' || replace(p_document_id::text, '-', '');
    v_new_path := v_new_parent_path || v_path_segment::ltree;

    -- 5. Prevent moving a folder into its own descendant (cycle detection)
    IF v_new_parent_path <@ v_old_path THEN
        RAISE EXCEPTION 'Cannot move a document into its own descendant';
    END IF;

    -- 6. Atomic update of the document and all its descendants
    UPDATE public.documents
    SET 
        parent_id = CASE WHEN id = p_document_id THEN p_new_parent_id ELSE parent_id END,
        path = v_new_path || 
               CASE 
                 WHEN nlevel(path) > nlevel(v_old_path) 
                 THEN subpath(path, nlevel(v_old_path)) 
                 ELSE ''::ltree 
               END,
        updated_at = NOW()
    WHERE path <@ v_old_path;

END;
$$;
