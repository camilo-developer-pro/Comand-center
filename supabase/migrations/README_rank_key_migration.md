# Fractional Indexing Migration - V2.1

## Overview
This migration adds support for fractional indexing to the `items` table, enabling O(1) reordering operations without the need to update multiple rows.

## Migration File
- **File**: `20250121_001_add_rank_key_column.sql`
- **Version**: V2.1
- **Reversible**: YES

## What This Migration Does

### 1. Adds `rank_key` Column
```sql
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS rank_key TEXT COLLATE "C";
```
- **Type**: `TEXT` with `COLLATE "C"` for byte-by-byte comparison
- **Nullable**: YES (temporarily, until backfill is complete)
- **Purpose**: Stores Base62 lexicographical strings for fractional indexing

### 2. Creates Unique Constraint
```sql
ALTER TABLE public.items
ADD CONSTRAINT items_unique_rank_per_parent 
UNIQUE (parent_id, rank_key)
DEFERRABLE INITIALLY DEFERRED;
```
- **Scope**: Unique within each parent (allows same rank_key in different folders)
- **Deferrable**: YES (allows temporary violations during transactions)

### 3. Creates Performance Index
```sql
CREATE INDEX IF NOT EXISTS idx_items_parent_rank_key 
ON public.items (parent_id, rank_key COLLATE "C");
```
- **Purpose**: Fast sibling ordering queries
- **Collation**: Explicitly set to "C" for deterministic sorting

## How to Apply This Migration

### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `20250121_001_add_rank_key_column.sql`
5. Paste and click **Run**
6. Verify success (should see "Success. No rows returned")

### Option B: Supabase CLI (Local Development)
```bash
# If using local Supabase
npx supabase db reset

# Or if linked to remote project
npx supabase db push
```

### Option C: Production Deployment
```bash
# Link to your production project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push
```

## Verification

After applying the migration, run the verification script:

```bash
# In Supabase Dashboard SQL Editor, run:
```
See `verify_rank_key.sql` for the complete verification queries.

### Expected Results
✅ Column `rank_key` exists with type `TEXT` and collation `"C"`  
✅ Constraint `items_unique_rank_per_parent` exists and is deferrable  
✅ Index `idx_items_parent_rank_key` exists  
✅ Column comment is set  
✅ All existing items have `NULL` rank_key (before backfill)

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Run these commands in order:
DROP INDEX IF EXISTS idx_items_parent_rank_key;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_unique_rank_per_parent;
ALTER TABLE public.items DROP COLUMN IF EXISTS rank_key;
```

## Next Steps

After this migration is verified:

1. **Backfill existing items** - Populate `rank_key` for all existing items
2. **Add NOT NULL constraint** - After backfill, make `rank_key` required
3. **Update application code** - Switch from `rank` to `rank_key` for ordering
4. **Deprecate `rank` column** - Eventually remove the old integer rank column

## Technical Details

### Why COLLATE "C"?
The `COLLATE "C"` ensures byte-by-byte comparison, which is critical for fractional indexing:
- Deterministic sorting across all locales
- Consistent behavior regardless of database locale settings
- Required for Base62 lexicographical ordering to work correctly

### Why Deferrable Constraint?
The `DEFERRABLE INITIALLY DEFERRED` allows:
- Temporary constraint violations during transactions
- Batch updates without intermediate constraint checks
- Easier migration and data manipulation

### Performance Impact
- **Minimal**: Adding a nullable column with an index has negligible impact
- **Index size**: Approximately 50-100 bytes per row
- **Query performance**: O(1) for sibling ordering (vs O(n) with integer rank)

## Related Documentation
- [Fractional Indexing Spec](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/)
- [PostgreSQL Collations](https://www.postgresql.org/docs/current/collation.html)
- [Deferrable Constraints](https://www.postgresql.org/docs/current/sql-set-constraints.html)
