-- V3.2 Phase 2: Blocks Path Trigger
-- Dependencies: 001_blocks_schema.sql (blocks_v3 table with path column)
-- Target: Create trigger to automatically maintain ltree path column when blocks are created or moved
-- 
-- Technical Requirements:
-- 1. Path Format: {workspace_uuid_no_hyphens}.{block_uuid_no_hyphens} for root blocks
-- 2. Nested blocks: Append child UUIDs to parent path
-- 3. On parent move: Update all descendant paths atomically
-- 4. Trigger only fires on parent_id changes, not on content updates

-- ============================================================================
-- 1. UUID to Ltree Label Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.uuid_to_ltree_label(p_uuid UUID)
RETURNS TEXT AS $$
  SELECT replace(p_uuid::text, '-', '');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

COMMENT ON FUNCTION public.uuid_to_ltree_label(UUID) IS 
'Convert UUID to ltree-safe label by stripping hyphens. 
Example: 123e4567-e89b-12d3-a456-426614174000 → 123e4567e89b12d3a456426614174000';

-- ============================================================================
-- 2. Blocks Compute Path Helper Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.blocks_compute_path(
    p_block_id UUID,
    p_parent_id UUID,
    p_workspace_id UUID
)
RETURNS public.ltree AS $$
DECLARE
    v_workspace_label TEXT;
    v_block_label TEXT;
    v_parent_path public.ltree;
BEGIN
    -- Convert UUIDs to ltree-safe labels
    v_workspace_label := public.uuid_to_ltree_label(p_workspace_id);
    v_block_label := public.uuid_to_ltree_label(p_block_id);
    
    IF p_parent_id IS NULL THEN
        -- Root block: workspace_uuid.block_uuid
        RETURN (v_workspace_label || '.' || v_block_label)::public.ltree;
    ELSE
        -- Nested block: parent_path || block_uuid
        SELECT path INTO v_parent_path
        FROM public.blocks_v3
        WHERE id = p_parent_id;
        
        IF v_parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent block % not found', p_parent_id;
        END IF;
        
        RETURN (v_parent_path::text || '.' || v_block_label)::public.ltree;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.blocks_compute_path(UUID, UUID, UUID) IS 
'Compute ltree path for a block based on parent relationship.
For root blocks (parent_id IS NULL): workspace_uuid.block_uuid
For nested blocks: parent_path || block_uuid';

-- ============================================================================
-- 3. Blocks Path Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.blocks_path_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_old_path public.ltree;
    v_new_path public.ltree;
BEGIN
    -- On INSERT: Always compute path
    IF TG_OP = 'INSERT' THEN
        NEW.path := public.blocks_compute_path(NEW.id, NEW.parent_id, NEW.workspace_id);
        RETURN NEW;
    END IF;
    
    -- On UPDATE: Only recompute if parent_id changed
    IF TG_OP = 'UPDATE' AND (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        -- Compute new path for this block
        v_new_path := public.blocks_compute_path(NEW.id, NEW.parent_id, NEW.workspace_id);
        
        -- If path hasn't actually changed, skip descendant updates
        IF v_new_path = OLD.path THEN
            NEW.path := v_new_path;
            RETURN NEW;
        END IF;
        
        -- Store old path for descendant updates
        v_old_path := OLD.path;
        
        -- Set new path for this block
        NEW.path := v_new_path;
        
        -- Update all descendant paths atomically
        -- Using subpath to replace the old prefix with new prefix
        UPDATE public.blocks_v3
        SET path = v_new_path || subpath(path, nlevel(v_old_path))
        WHERE path <@ v_old_path 
          AND id != NEW.id;
        
        RETURN NEW;
    END IF;
    
    -- For other updates (content, type, etc.), keep existing path
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.blocks_path_trigger_fn() IS 
'Trigger function to maintain ltree path column in blocks_v3 table.
On INSERT: Computes path based on parent_id and workspace_id.
On UPDATE OF parent_id: Recomputes path for block and all descendants atomically.';

-- ============================================================================
-- 4. Create Trigger
-- ============================================================================
CREATE TRIGGER blocks_path_sync
  BEFORE INSERT OR UPDATE OF parent_id ON public.blocks_v3
  FOR EACH ROW EXECUTE FUNCTION public.blocks_path_trigger_fn();

COMMENT ON TRIGGER blocks_path_sync ON public.blocks_v3 IS 
'Maintains ltree path column automatically when blocks are created or moved.
Only fires on parent_id changes, not on content updates.';

-- ============================================================================
-- 5. Verification Examples (Commentary, not executed)
-- ============================================================================
/*
-- Test Scenario 1: Insert root block
INSERT INTO public.blocks_v3 (id, workspace_id, user_id, parent_id, path, type, sort_order, content)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    '', -- Will be set by trigger
    'text',
    'a0',
    '{}'::jsonb
);
-- Expected path: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.11111111111111111111111111111111

-- Test Scenario 2: Insert child block
INSERT INTO public.blocks_v3 (id, workspace_id, user_id, parent_id, path, type, sort_order, content)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    '',
    'text',
    'a1',
    '{}'::jsonb
);
-- Expected path: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.11111111111111111111111111111111.22222222222222222222222222222222

-- Test Scenario 3: Move child to new parent
UPDATE public.blocks_v3
SET parent_id = '33333333-3333-3333-3333-333333333333'
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: Block 2222... path changes to include new parent's path prefix
-- All descendants of 2222... also get updated paths

-- Test Scenario 4: Move to root (parent_id = NULL)
UPDATE public.blocks_v3
SET parent_id = NULL
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected path: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.22222222222222222222222222222222
*/

-- ============================================================================
-- 6. Migration Complete
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'V3.2 Blocks Path Trigger Migration Complete';
    RAISE NOTICE '  - Created uuid_to_ltree_label() function';
    RAISE NOTICE '  - Created blocks_compute_path() helper function';
    RAISE NOTICE '  - Created blocks_path_trigger_fn() trigger function';
    RAISE NOTICE '  - Created blocks_path_sync trigger on blocks_v3 table';
    RAISE NOTICE '  - Path column will now be automatically maintained on INSERT/UPDATE OF parent_id';
END $$;
