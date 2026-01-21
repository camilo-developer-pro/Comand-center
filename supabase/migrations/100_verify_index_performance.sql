-- Index Performance Verification Script
-- Run this in Supabase SQL Editor AFTER applying migration 20250121_005

-- 1. Verify GiST Index for Hierarchy Traversal
-- The EXPLAIN should show "Index Scan using idx_items_path_gist"
SELECT 'Verifying Hierarchy GiST Index...' AS test_step;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.items
WHERE path <@ 'root'::ltree
LIMIT 100;

-- 2. Verify Sibling Ordering using Composite Index
-- The EXPLAIN should show "Index Scan using idx_items_sibling_order"
-- (Find a parent_id from your data first)
SELECT 'Verifying Sibling Order B-Tree Index...' AS test_step;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.items
WHERE parent_id = (SELECT parent_id FROM public.items WHERE parent_id IS NOT NULL LIMIT 1)
ORDER BY rank_key COLLATE "C"
LIMIT 100;

-- 3. Verify Index Sizes and Health
SELECT 
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as total_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'items'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. Verify Index Parameter (siglen)
-- Note: Checking siglen requires inspecting pg_opclass/pg_am, 
-- but we can infer success from the index definition
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'items' AND indexname = 'idx_items_path_gist';
