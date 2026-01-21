-- Verification Script for rank_key Migration
-- Run this query after applying the migration to verify success

-- Check 1: Verify rank_key column exists with correct properties
SELECT 
    column_name,
    data_type,
    collation_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'items' 
  AND column_name = 'rank_key';

-- Expected output:
-- column_name | data_type | collation_name | is_nullable | column_default
-- rank_key    | text      | C              | YES         | NULL

-- Check 2: Verify unique constraint exists
SELECT 
    con.conname AS constraint_name,
    con.condeferrable AS is_deferrable,
    con.condeferred AS initially_deferred
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'items'
  AND con.conname = 'items_unique_rank_per_parent';

-- Expected output:
-- constraint_name              | is_deferrable | initially_deferred
-- items_unique_rank_per_parent | true          | true

-- Check 3: Verify index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'items'
  AND indexname = 'idx_items_parent_rank_key';

-- Expected output:
-- indexname                 | indexdef
-- idx_items_parent_rank_key | CREATE INDEX idx_items_parent_rank_key ON public.items USING btree (parent_id, (rank_key COLLATE "C"))

-- Check 4: Verify column comment
SELECT 
    col_description('public.items'::regclass, 
                    (SELECT ordinal_position 
                     FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                       AND table_name = 'items' 
                       AND column_name = 'rank_key')) AS column_comment;

-- Expected output:
-- column_comment
-- Fractional indexing key for O(1) reordering. Uses Base62 lexicographical strings. COLLATE C ensures deterministic sorting.

-- Check 5: Count existing items (should all have NULL rank_key initially)
SELECT 
    COUNT(*) AS total_items,
    COUNT(rank_key) AS items_with_rank_key,
    COUNT(*) - COUNT(rank_key) AS items_without_rank_key
FROM public.items;

-- Expected output (before backfill):
-- total_items | items_with_rank_key | items_without_rank_key
-- <N>         | 0                   | <N>
