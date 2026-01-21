-- Monitor Backfill Progress
-- Run this during migration execution

-- 1. Progress tracking
SELECT 
    COUNT(*) as total_items,
    COUNT(rank_key) as items_with_key,
    COUNT(*) - COUNT(rank_key) as items_pending
FROM public.items;

-- 2. Visual verification
-- Sample the data to verify ordering
SELECT id, parent_id, sort_order as old_rank, rank_key
FROM public.items
WHERE parent_id = (SELECT parent_id FROM public.items WHERE sort_order IS NOT NULL LIMIT 1)
ORDER BY rank_key COLLATE "C"
LIMIT 20;

-- 3. Check for duplicates (Safety net)
SELECT parent_id, rank_key, COUNT(*)
FROM public.items
GROUP BY parent_id, rank_key
HAVING COUNT(*) > 1;
