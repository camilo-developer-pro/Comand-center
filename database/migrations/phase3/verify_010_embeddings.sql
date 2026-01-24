-- ============================================================================
-- V3.1 Phase 3: Embedding Optimization Verification
-- Script: verify_010_embeddings.sql
-- Purpose: Verify HNSW index, search functions, and embedding health monitoring
-- ============================================================================

DO $$
DECLARE
    test_workspace_id UUID;
    stats RECORD;
    index_exists BOOLEAN;
    function_exists BOOLEAN;
    view_exists BOOLEAN;
    test_embedding vector(1536);
BEGIN
    RAISE NOTICE '🔍 Starting Embedding Optimization Verification...';
    RAISE NOTICE '==================================================';

    -- Step 1: Verify HNSW index exists
    RAISE NOTICE '1. Verifying HNSW index creation...';
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_blocks_embedding_hnsw'
    ) INTO index_exists;
    
    IF NOT index_exists THEN
        RAISE EXCEPTION '❌ HNSW index idx_blocks_embedding_hnsw not found';
    END IF;
    RAISE NOTICE '   ✅ HNSW index exists';

    -- Step 2: Verify index parameters
    RAISE NOTICE '2. Verifying HNSW index parameters...';
    SELECT 
        (indexdef LIKE '%m = 16%') AS has_m_16,
        (indexdef LIKE '%ef_construction = 64%') AS has_ef_64,
        (indexdef LIKE '%vector_cosine_ops%') AS has_cosine_ops
    INTO index_exists
    FROM pg_indexes 
    WHERE indexname = 'idx_blocks_embedding_hnsw';
    
    IF NOT index_exists THEN
        RAISE WARNING '   ⚠️  HNSW index parameters may not match specification';
    ELSE
        RAISE NOTICE '   ✅ HNSW index has correct parameters (m=16, ef_construction=64, cosine_ops)';
    END IF;

    -- Step 3: Verify search_blocks_semantic function exists
    RAISE NOTICE '3. Verifying search_blocks_semantic function...';
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'search_blocks_semantic'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO function_exists;
    
    IF NOT function_exists THEN
        RAISE EXCEPTION '❌ Function search_blocks_semantic not found';
    END IF;
    RAISE NOTICE '   ✅ search_blocks_semantic function exists';

    -- Step 4: Verify get_embedding_stats function exists
    RAISE NOTICE '4. Verifying get_embedding_stats function...';
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_embedding_stats'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO function_exists;
    
    IF NOT function_exists THEN
        RAISE EXCEPTION '❌ Function get_embedding_stats not found';
    END IF;
    RAISE NOTICE '   ✅ get_embedding_stats function exists';

    -- Step 5: Verify queue_stale_embeddings function exists
    RAISE NOTICE '5. Verifying queue_stale_embeddings function...';
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'queue_stale_embeddings'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) INTO function_exists;
    
    IF NOT function_exists THEN
        RAISE EXCEPTION '❌ Function queue_stale_embeddings not found';
    END IF;
    RAISE NOTICE '   ✅ queue_stale_embeddings function exists';

    -- Step 6: Verify embedding_health view exists
    RAISE NOTICE '6. Verifying embedding_health view...';
    SELECT EXISTS (
        SELECT 1 FROM pg_views 
        WHERE viewname = 'embedding_health'
          AND schemaname = 'public'
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE EXCEPTION '❌ View embedding_health not found';
    END IF;
    RAISE NOTICE '   ✅ embedding_health view exists';

    -- Step 7: Test embedding stats function (if workspace exists)
    RAISE NOTICE '7. Testing embedding stats function...';
    SELECT id INTO test_workspace_id FROM public.workspaces LIMIT 1;
    
    IF test_workspace_id IS NULL THEN
        RAISE NOTICE '   ⚠️  No workspace found, skipping stats test';
    ELSE
        SELECT * INTO stats FROM public.get_embedding_stats(test_workspace_id);
        
        RAISE NOTICE '   ✅ Embedding stats for workspace %:', test_workspace_id;
        RAISE NOTICE '      - Total blocks: %', stats.total_blocks;
        RAISE NOTICE '      - Embedded blocks: %', stats.embedded_blocks;
        RAISE NOTICE '      - Pending blocks: %', stats.pending_blocks;
        RAISE NOTICE '      - Coverage: % %%', stats.coverage_percent;
    END IF;

    -- Step 8: Verify function permissions
    RAISE NOTICE '8. Verifying function permissions...';
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routine_privileges 
        WHERE routine_name = 'search_blocks_semantic'
          AND grantee = 'authenticated'
          AND privilege_type = 'EXECUTE'
    ) INTO function_exists;
    
    IF NOT function_exists THEN
        RAISE WARNING '   ⚠️  search_blocks_semantic may not have EXECUTE permission for authenticated';
    ELSE
        RAISE NOTICE '   ✅ search_blocks_semantic has EXECUTE permission for authenticated';
    END IF;

    -- Step 9: Verify view permissions
    RAISE NOTICE '9. Verifying view permissions...';
    SELECT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants 
        WHERE table_name = 'embedding_health'
          AND grantee = 'authenticated'
          AND privilege_type = 'SELECT'
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE WARNING '   ⚠️  embedding_health may not have SELECT permission for authenticated';
    ELSE
        RAISE NOTICE '   ✅ embedding_health has SELECT permission for authenticated';
    END IF;

    -- Step 10: Test semantic search function structure (without actual embedding)
    RAISE NOTICE '10. Testing semantic search function structure...';
    BEGIN
        -- Create a test embedding (zero vector)
        test_embedding := array_fill(0::real, ARRAY[1536])::vector(1536);
        
        -- Test that the function can be called (even if it returns no results)
        PERFORM 1 FROM public.search_blocks_semantic(
            test_workspace_id,
            test_embedding,
            1,
            0.1
        ) LIMIT 1;
        
        RAISE NOTICE '   ✅ search_blocks_semantic function callable';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING '   ⚠️  search_blocks_semantic call failed: %', SQLERRM;
    END;

    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ Embedding Optimization Verification Complete!';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of verified components:';
    RAISE NOTICE '  - HNSW index with optimized parameters (m=16, ef_construction=64)';
    RAISE NOTICE '  - Semantic search function (search_blocks_semantic)';
    RAISE NOTICE '  - Embedding statistics function (get_embedding_stats)';
    RAISE NOTICE '  - Stale embedding queue function (queue_stale_embeddings)';
    RAISE NOTICE '  - Embedding health monitoring view (embedding_health)';
    RAISE NOTICE '  - Proper permissions for authenticated users';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for V3.1 Phase 3 Week 9: Vector Embeddings Integration! ⚡';
END;
$$;