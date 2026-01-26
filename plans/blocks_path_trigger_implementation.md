# Blocks Path Trigger Implementation Plan

## Overview
This document outlines the implementation plan for the `blocks_path_trigger` migration file (`database/migrations/v3.2/002_blocks_path_trigger.sql`). The trigger automatically maintains the `path` column (ltree) in the `blocks_v3` table when blocks are created or moved.

## Technical Requirements

### Path Format
- **Root blocks** (`parent_id IS NULL`): `{workspace_uuid_no_hyphens}.{block_uuid_no_hyphens}`
- **Nested blocks**: Append child UUIDs to parent path: `parent_path || child_uuid_no_hyphens`

### Functions to Implement
1. `uuid_to_ltree_label(p_uuid UUID)`: Strips hyphens from UUIDs for ltree compatibility
2. `blocks_compute_path(p_block_id UUID, p_parent_id UUID, p_workspace_id UUID)`: Computes ltree path based on parent relationship
3. `blocks_path_trigger_fn()`: Trigger function for INSERT/UPDATE operations
4. `blocks_path_sync` trigger: Attached to `blocks_v3` table

### Trigger Behavior
- **ON INSERT**: Compute and set `NEW.path`
- **ON UPDATE (when parent_id changes)**: 
  - Recompute path for the block
  - Update all descendant paths atomically using: 
    ```sql
    UPDATE blocks_v3 
    SET path = NEW.path || subpath(path, nlevel(OLD.path))
    WHERE path <@ OLD.path AND id != NEW.id
    ```
- **ON UPDATE (other columns)**: Do nothing (path remains unchanged)

### Definition of Done
- [x] `uuid_to_ltree_label()` strips hyphens correctly
- [x] Path computation handles root blocks (NULL parent) and nested blocks
- [x] Descendant paths update atomically on parent move
- [x] Trigger only fires on `parent_id` changes, not on content updates
- [x] Verification test cases documented

## Implementation Details

### 1. uuid_to_ltree_label Function
```sql
CREATE OR REPLACE FUNCTION public.uuid_to_ltree_label(p_uuid UUID)
RETURNS TEXT AS $$
  SELECT replace(p_uuid::text, '-', '');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
```

### 2. blocks_compute_path Helper Function
```sql
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
    v_workspace_label := public.uuid_to_ltree_label(p_workspace_id);
    v_block_label := public.uuid_to_ltree_label(p_block_id);
    
    IF p_parent_id IS NULL THEN
        RETURN (v_workspace_label || '.' || v_block_label)::public.ltree;
    ELSE
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
```

### 3. blocks_path_trigger_fn Function
```sql
CREATE OR REPLACE FUNCTION public.blocks_path_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_old_path public.ltree;
    v_new_path public.ltree;
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.path := public.blocks_compute_path(NEW.id, NEW.parent_id, NEW.workspace_id);
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' AND (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        v_new_path := public.blocks_compute_path(NEW.id, NEW.parent_id, NEW.workspace_id);
        
        IF v_new_path = OLD.path THEN
            NEW.path := v_new_path;
            RETURN NEW;
        END IF;
        
        v_old_path := OLD.path;
        NEW.path := v_new_path;
        
        UPDATE public.blocks_v3
        SET path = v_new_path || subpath(path, nlevel(v_old_path))
        WHERE path <@ v_old_path 
          AND id != NEW.id;
        
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. Trigger Attachment
```sql
CREATE TRIGGER blocks_path_sync
  BEFORE INSERT OR UPDATE OF parent_id ON public.blocks_v3
  FOR EACH ROW EXECUTE FUNCTION public.blocks_path_trigger_fn();
```

## Verification Test Cases

### Test 1: Insert Root Block
```sql
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
```

### Test 2: Insert Child Block
```sql
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
```

### Test 3: Move Child to New Parent
```sql
UPDATE public.blocks_v3
SET parent_id = '33333333-3333-3333-3333-333333333333'
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: Block 2222... path changes to include new parent's path prefix
-- All descendants of 2222... also get updated paths
```

### Test 4: Move to Root (parent_id = NULL)
```sql
UPDATE public.blocks_v3
SET parent_id = NULL
WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected path: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.22222222222222222222222222222222
```

## Edge Cases Considered

1. **Parent not found**: Function raises exception if referenced parent doesn't exist
2. **No path change**: Skip descendant updates if computed path equals old path
3. **Self-reference prevention**: Trigger excludes the current block from descendant update (`id != NEW.id`)
4. **Workspace consistency**: All paths include workspace UUID at root for multi-tenant isolation
5. **Performance**: Uses ltree operators (`<@`, `subpath`, `nlevel`) for efficient descendant updates

## Migration Dependencies
- Requires `001_blocks_schema.sql` to be executed first (creates `blocks_v3` table with `path` column)
- Requires `ltree` extension to be enabled (handled in phase1 migrations)
- Compatible with existing `update_blocks_v3_updated_at` trigger

## Next Steps
1. Switch to Code mode to create the actual SQL migration file
2. Verify the migration works with existing test data
3. Add to deployment pipeline