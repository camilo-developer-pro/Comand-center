-- ============================================================================
-- Verification Script for Phase 4 Index Optimization
-- ============================================================================

-- Step 1: Verify GIST indexes exist with correct settings
SELECT 
    'GIST Index Check' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('blocks', 'documents')
AND indexdef LIKE '%gist%';

-- Step 2: Verify composite B-Tree indexes
SELECT 
    'B-Tree Index Check' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'blocks'
AND (indexname LIKE '%sort%' OR indexname LIKE '%covering%');

-- Step 3: Verify HNSW vector indexes
SELECT 
    'HNSW Index Check' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'blocks'
AND indexdef LIKE '%hnsw%';

-- Step 4: Verify knowledge graph indexes
SELECT 
    'KG Index Check' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'knowledge_graph_edges';

-- Step 5: Check index sizes
SELECT 
    'Index Size' as check_type,
    relname as index_name,
    pg_size_pretty(pg_relation_size(oid)) as size
FROM pg_class
WHERE relkind = 'i'
AND relname LIKE 'idx_blocks%'
OR relname LIKE 'idx_documents%'
OR relname LIKE 'idx_kg_%'
ORDER BY pg_relation_size(oid) DESC;

-- Step 6: Verify tuning function exists
SELECT 
    'Tuning Function Check' as check_type,
    proname,
    prosrc IS NOT NULL as has_source
FROM pg_proc
WHERE proname = 'set_vector_search_accuracy';

-- Step 7: Test query plan uses new indexes
EXPLAIN (COSTS OFF, FORMAT TEXT)
SELECT * FROM blocks 
WHERE document_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY sort_order COLLATE "C";
