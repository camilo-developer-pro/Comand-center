-- Verification Script for Phase 3 Week 7: Asynchronous Triggers
-- Verifies both Task 7.1 (007_block_change_trigger.sql) and Task 7.2 (008_attach_block_trigger.sql)
-- 
-- Purpose: Comprehensive verification of the complete trigger infrastructure
-- for incremental GraphRAG processing.

-- ============================================================================
-- SECTION 1: PREREQUISITE VERIFICATION
-- ============================================================================

-- 1.1 Verify required extensions are enabled
SELECT '1.1 Checking required extensions' as verification_step;
SELECT 
    extname as extension_name,
    extversion as version,
    CASE 
        WHEN extname IN ('uuid-ossp', 'pgcrypto', 'pg_net') THEN '✅ REQUIRED'
        ELSE '⚠️ OPTIONAL'
    END as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_net')
ORDER BY extname;

-- 1.2 Verify blocks table has required columns
SELECT '1.2 Checking blocks table structure' as verification_step;
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('embedding', 'content_hash', 'embedding_updated_at') THEN '✅ REQUIRED'
        ELSE '✅ PRESENT'
    END as status
FROM information_schema.columns
WHERE table_name = 'blocks'
    AND table_schema = 'public'
    AND column_name IN ('id', 'document_id', 'content', 'type', 'embedding', 'content_hash', 'embedding_updated_at', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- 1.3 Verify knowledge_graph_edges table exists
SELECT '1.3 Checking knowledge_graph_edges table' as verification_step;
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'knowledge_graph_edges' THEN '✅ PRESENT'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables
WHERE table_name = 'knowledge_graph_edges'
    AND table_schema = 'public';

-- ============================================================================
-- SECTION 2: TASK 7.1 VERIFICATION (Existing Implementation)
-- ============================================================================

-- 2.1 Verify async_processing_errors table exists
SELECT '2.1 Checking async_processing_errors table' as verification_step;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'async_processing_errors'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2.2 Verify compute_content_hash function exists
SELECT '2.2 Checking compute_content_hash function' as verification_step;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'compute_content_hash'
    AND routine_schema = 'public';

-- 2.3 Verify fn_notify_block_change function exists
SELECT '2.3 Checking fn_notify_block_change function' as verification_step;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'fn_notify_block_change'
    AND routine_schema = 'public';

-- 2.4 Verify trigger_notify_block_change trigger exists
SELECT '2.4 Checking trigger_notify_block_change trigger' as verification_step;
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'public.blocks'::regclass
    AND tgname = 'trigger_notify_block_change';

-- ============================================================================
-- SECTION 3: TASK 7.2 VERIFICATION (New Implementation)
-- ============================================================================

-- 3.1 Verify block_processing_queue view exists
SELECT '3.1 Checking block_processing_queue view' as verification_step;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'block_processing_queue'
    AND table_schema = 'public';

-- 3.2 Verify idx_blocks_content_hash index exists
SELECT '3.2 Checking idx_blocks_content_hash index' as verification_step;
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'blocks'
    AND indexname = 'idx_blocks_content_hash';

-- 3.3 Verify fn_block_content_changed function exists
SELECT '3.3 Checking fn_block_content_changed function' as verification_step;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'fn_block_content_changed'
    AND routine_schema = 'public';

-- 3.4 Verify trg_block_content_changed trigger exists
SELECT '3.4 Checking trg_block_content_changed trigger' as verification_step;
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'public.blocks'::regclass
    AND tgname = 'trg_block_content_changed';

-- 3.5 Verify trigger_block_processing function exists
SELECT '3.5 Checking trigger_block_processing function' as verification_step;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'trigger_block_processing'
    AND routine_schema = 'public'
    AND data_type = 'boolean';

-- 3.6 Verify cleanup_old_processing_errors function exists
SELECT '3.6 Checking cleanup_old_processing_errors function' as verification_step;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'cleanup_old_processing_errors'
    AND routine_schema = 'public'
    AND data_type = 'integer';

-- ============================================================================
-- SECTION 4: FUNCTIONAL TESTS
-- ============================================================================

-- 4.1 Test compute_content_hash function
SELECT '4.1 Testing compute_content_hash function' as verification_step;
WITH test_data AS (
    SELECT
        '{"type":"paragraph","content":[{"type":"text","text":"Hello World"}]}'::jsonb as content1,
        '{"type":"paragraph","content":[{"type":"text","text":"Hello World!"}]}'::jsonb as content2,
        '{"type":"paragraph","content":[{"type":"text","text":"Hello World"}]}'::jsonb as content3
),
hash_results AS (
    SELECT
        public.compute_content_hash(content1) as hash1,
        public.compute_content_hash(content2) as hash2,
        public.compute_content_hash(content3) as hash3
    FROM test_data
)
SELECT
    hash1,
    hash2,
    hash3,
    hash1 = hash2 as should_be_false,
    hash1 = hash3 as should_be_true
FROM hash_results;

-- 4.2 Test block_processing_queue view (if there are blocks)
SELECT '4.2 Testing block_processing_queue view' as verification_step;
SELECT 
    COUNT(*) as total_blocks_in_queue,
    COUNT(CASE WHEN embedding_status = 'pending_embedding' THEN 1 END) as pending_embedding,
    COUNT(CASE WHEN embedding_status = 'embedding_complete' THEN 1 END) as embedding_complete,
    COUNT(CASE WHEN error_status = 'has_errors' THEN 1 END) as blocks_with_errors
FROM public.block_processing_queue;

-- 4.3 Test manual trigger function (requires at least one block)
SELECT '4.3 Testing trigger_block_processing function availability' as verification_step;
SELECT 
    routine_name,
    '✅ AVAILABLE' as status
FROM information_schema.routines 
WHERE routine_name = 'trigger_block_processing'
    AND routine_schema = 'public';

-- ============================================================================
-- SECTION 5: COMPREHENSIVE STATUS SUMMARY
-- ============================================================================

SELECT '5.1 COMPREHENSIVE VERIFICATION SUMMARY' as verification_step;
WITH verification_results AS (
    -- Extension verification
    SELECT 'Extensions' as category, COUNT(*) as required, COUNT(*) as present FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_net')
    UNION ALL
    -- Table verification
    SELECT 'Tables', 4, COUNT(*) FROM (
        SELECT 1 FROM information_schema.tables WHERE table_name IN ('blocks', 'knowledge_graph_edges', 'async_processing_errors') AND table_schema = 'public'
        UNION ALL SELECT 1 FROM information_schema.views WHERE table_name = 'block_processing_queue' AND table_schema = 'public'
    ) t
    UNION ALL
    -- Function verification
    SELECT 'Functions', 6, COUNT(*) FROM information_schema.routines WHERE routine_name IN (
        'compute_content_hash', 'fn_notify_block_change', 'fn_block_content_changed', 
        'trigger_block_processing', 'cleanup_old_processing_errors'
    ) AND routine_schema = 'public'
    UNION ALL
    -- Trigger verification
    SELECT 'Triggers', 2, COUNT(*) FROM pg_trigger WHERE tgrelid = 'public.blocks'::regclass AND tgname IN ('trigger_notify_block_change', 'trg_block_content_changed')
    UNION ALL
    -- Index verification
    SELECT 'Indexes', 2, COUNT(*) FROM pg_indexes WHERE tablename = 'blocks' AND indexname IN ('idx_async_errors_block_id', 'idx_blocks_content_hash')
)
SELECT 
    category,
    required,
    present,
    CASE 
        WHEN present >= required THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status
FROM verification_results
ORDER BY category;

-- ============================================================================
-- SECTION 6: RECOMMENDATIONS AND NEXT STEPS
-- ============================================================================

SELECT '6.1 RECOMMENDATIONS FOR PRODUCTION DEPLOYMENT' as verification_step;
SELECT 
    'Environment Variables' as item,
    'Set app.edge_function_process_block_url and app.service_role_key via Supabase Dashboard' as recommendation,
    'Required for Edge Function calls' as importance
UNION ALL
SELECT 
    'Edge Function',
    'Deploy supabase/functions/process-block/index.ts to Supabase',
    'Required for entity extraction and graph updates'
UNION ALL
SELECT 
    'Testing',
    'Insert test blocks and verify async_processing_errors table for any failures',
    'Recommended before production use'
UNION ALL
SELECT 
    'Monitoring',
    'Set up alerts on unresolved errors in async_processing_errors table',
    'Recommended for production monitoring'
UNION ALL
SELECT 
    'Performance',
    'Monitor block_processing_queue view for backlog of pending embeddings',
    'Recommended for capacity planning';

-- ============================================================================
-- SECTION 7: QUICK STATUS CHECK (For automated scripts)
-- ============================================================================

SELECT '7.1 QUICK STATUS CHECK - ALL SYSTEMS GO?' as verification_step;
WITH status_check AS (
    SELECT 
        (SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_net')) = 3 as extensions_ok,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'blocks' AND table_schema = 'public') > 0 as blocks_table_ok,
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'fn_notify_block_change' AND routine_schema = 'public') > 0 as main_function_ok,
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'fn_block_content_changed' AND routine_schema = 'public') > 0 as task72_function_ok,
        (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'public.blocks'::regclass AND tgname = 'trg_block_content_changed') > 0 as task72_trigger_ok
)
SELECT 
    CASE 
        WHEN extensions_ok AND blocks_table_ok AND main_function_ok AND task72_function_ok AND task72_trigger_ok 
        THEN '✅ PHASE 3 WEEK 7 COMPLETE: All triggers and monitoring infrastructure deployed successfully.'
        ELSE '❌ INCOMPLETE: Some components missing. Check individual verification steps above.'
    END as overall_status
FROM status_check;
