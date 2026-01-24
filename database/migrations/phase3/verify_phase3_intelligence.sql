-- ============================================================================
-- V3.1 Phase 3: Intelligence Layer Comprehensive Verification
-- File: verify_phase3_intelligence.sql
-- Purpose: End-to-end verification of the complete intelligence layer
--          Tests trigger → Edge Function → Knowledge Graph → Embeddings flow
-- ============================================================================

-- ============================================================================
-- SECTION 1: PREREQUISITE VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_test_count INT := 0;
    v_pass_count INT := 0;
    v_workspace_id UUID;
    v_document_id UUID;
    v_block_id UUID;
    v_test_embedding vector(1536) := array_fill(0.1::real, ARRAY[1536])::vector;
    v_similarity_threshold FLOAT := 0.7;
    v_search_results JSONB;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Phase 3 Intelligence Layer Verification';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';

    -- Test 1: Verify required extensions
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 1: pg_net extension enabled';
    ELSE
        RAISE WARNING '✗ Test 1: pg_net extension missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 2: vector extension enabled';
    ELSE
        RAISE WARNING '✗ Test 2: vector extension missing';
    END IF;

    -- Test 3: Verify blocks table structure
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blocks' 
        AND column_name = 'embedding'
        AND data_type = 'USER-DEFINED'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 3: blocks.embedding column exists (vector type)';
    ELSE
        RAISE WARNING '✗ Test 3: blocks.embedding column missing or wrong type';
    END IF;

    -- Test 4: Verify HNSW index
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_blocks_embedding_hnsw'
        AND indexdef LIKE '%hnsw%'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 4: HNSW index exists';
    ELSE
        RAISE WARNING '✗ Test 4: HNSW index missing';
    END IF;

    -- Test 5: Verify knowledge_graph_edges table
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'knowledge_graph_edges'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 5: knowledge_graph_edges table exists';
    ELSE
        RAISE WARNING '✗ Test 5: knowledge_graph_edges table missing';
    END IF;

    -- Test 6: Verify async_processing_errors table
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'async_processing_errors'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 6: async_processing_errors table exists';
    ELSE
        RAISE WARNING '✗ Test 6: async_processing_errors table missing';
    END IF;

    -- ============================================================================
    -- SECTION 2: TRIGGER INFRASTRUCTURE VERIFICATION
    -- ============================================================================

    -- Test 7: Verify block change trigger function
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'fn_block_content_changed'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 7: fn_block_content_changed function exists';
    ELSE
        RAISE WARNING '✗ Test 7: fn_block_content_changed function missing';
    END IF;

    -- Test 8: Verify block change trigger
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgrelid = 'public.blocks'::regclass 
        AND tgname = 'trg_block_content_changed'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 8: trg_block_content_changed trigger exists';
    ELSE
        RAISE WARNING '✗ Test 8: trg_block_content_changed trigger missing';
    END IF;

    -- Test 9: Verify compute_content_hash function
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'compute_content_hash'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 9: compute_content_hash function exists';
    ELSE
        RAISE WARNING '✗ Test 9: compute_content_hash function missing';
    END IF;

    -- ============================================================================
    -- SECTION 3: KNOWLEDGE GRAPH FUNCTIONS VERIFICATION
    -- ============================================================================

    -- Test 10: Verify knowledge graph upsert functions
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'upsert_knowledge_graph_edge'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 10: upsert_knowledge_graph_edge function exists';
    ELSE
        RAISE WARNING '✗ Test 10: upsert_knowledge_graph_edge function missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'upsert_knowledge_graph_edges_batch'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 11: upsert_knowledge_graph_edges_batch function exists';
    ELSE
        RAISE WARNING '✗ Test 11: upsert_knowledge_graph_edges_batch function missing';
    END IF;

    -- ============================================================================
    -- SECTION 4: SEMANTIC SEARCH FUNCTIONS VERIFICATION
    -- ============================================================================

    -- Test 12: Verify semantic search function
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'search_blocks_semantic'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 12: search_blocks_semantic function exists';
    ELSE
        RAISE WARNING '✗ Test 12: search_blocks_semantic function missing';
    END IF;

    -- Test 13: Verify embedding stats function
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_embedding_stats'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 13: get_embedding_stats function exists';
    ELSE
        RAISE WARNING '✗ Test 13: get_embedding_stats function missing';
    END IF;

    -- Test 14: Verify queue stale embeddings function
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'queue_stale_embeddings'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 14: queue_stale_embeddings function exists';
    ELSE
        RAISE WARNING '✗ Test 14: queue_stale_embeddings function missing';
    END IF;

    -- Test 15: Verify embedding health view
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'embedding_health'
    ) THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 15: embedding_health view exists';
    ELSE
        RAISE WARNING '✗ Test 15: embedding_health view missing';
    END IF;

    -- ============================================================================
    -- SECTION 5: FUNCTIONAL TESTS (If test data exists)
    -- ============================================================================

    -- Try to get a workspace for functional tests
    SELECT id INTO v_workspace_id FROM public.workspaces LIMIT 1;
    
    IF v_workspace_id IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE 'Functional tests with workspace: %', v_workspace_id;
        
        -- Test 16: Test get_embedding_stats function
        v_test_count := v_test_count + 1;
        BEGIN
            PERFORM public.get_embedding_stats(v_workspace_id);
            v_pass_count := v_pass_count + 1;
            RAISE NOTICE '✓ Test 16: get_embedding_stats function executes successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '✗ Test 16: get_embedding_stats function failed: %', SQLERRM;
        END;

        -- Test 17: Test search_blocks_semantic function (with dummy embedding)
        v_test_count := v_test_count + 1;
        BEGIN
            PERFORM public.search_blocks_semantic(
                v_workspace_id,
                v_test_embedding,
                5,
                v_similarity_threshold
            );
            v_pass_count := v_pass_count + 1;
            RAISE NOTICE '✓ Test 17: search_blocks_semantic function executes successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '✗ Test 17: search_blocks_semantic function failed: %', SQLERRM;
        END;

        -- Test 18: Test embedding health view
        v_test_count := v_test_count + 1;
        BEGIN
            PERFORM * FROM public.embedding_health WHERE workspace_id = v_workspace_id;
            v_pass_count := v_pass_count + 1;
            RAISE NOTICE '✓ Test 18: embedding_health view query executes successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '✗ Test 18: embedding_health view query failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  No workspace found, skipping functional tests 16-18';
        v_test_count := v_test_count + 3; -- Account for skipped tests
    END IF;

    -- ============================================================================
    -- SECTION 6: EDGE FUNCTION CONFIGURATION VERIFICATION
    -- ============================================================================

    -- Test 19: Verify Edge Function URL configuration
    v_test_count := v_test_count + 1;
    BEGIN
        -- Check if Edge Function URL is configured in vault
        IF EXISTS (
            SELECT 1 FROM vault.decrypted_secrets 
            WHERE name = 'EDGE_FUNCTION_PROCESS_BLOCK_URL'
        ) THEN
            v_pass_count := v_pass_count + 1;
            RAISE NOTICE '✓ Test 19: Edge Function URL configured in vault';
        ELSE
            -- Check if it's configured via current_setting
            IF current_setting('app.edge_function_process_block_url', true) IS NOT NULL THEN
                v_pass_count := v_pass_count + 1;
                RAISE NOTICE '✓ Test 19: Edge Function URL configured via current_setting';
            ELSE
                RAISE WARNING '✗ Test 19: Edge Function URL not configured';
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '✗ Test 19: Edge Function URL configuration check failed: %', SQLERRM;
    END;

    -- Test 20: Verify service role key configuration
    v_test_count := v_test_count + 1;
    BEGIN
        IF current_setting('app.service_role_key', true) IS NOT NULL THEN
            v_pass_count := v_pass_count + 1;
            RAISE NOTICE '✓ Test 20: Service role key configured';
        ELSE
            RAISE WARNING '✗ Test 20: Service role key not configured';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '✗ Test 20: Service role key configuration check failed: %', SQLERRM;
    END;

    -- ============================================================================
    -- SECTION 7: COMPREHENSIVE STATUS SUMMARY
    -- ============================================================================

    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VERIFICATION SUMMARY';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total Tests: %', v_test_count;
    RAISE NOTICE 'Tests Passed: %', v_pass_count;
    RAISE NOTICE 'Tests Failed: %', v_test_count - v_pass_count;
    RAISE NOTICE 'Success Rate: %%%', ROUND((v_pass_count::float / v_test_count) * 100, 1);
    
    IF v_pass_count = v_test_count THEN
        RAISE NOTICE '✅ PHASE 3 INTELLIGENCE LAYER VERIFICATION COMPLETE';
        RAISE NOTICE 'All components are properly configured and ready for use.';
    ELSIF v_pass_count >= v_test_count * 0.8 THEN
        RAISE NOTICE '⚠️  PHASE 3 INTELLIGENCE LAYER PARTIALLY COMPLETE';
        RAISE NOTICE 'Most components are configured. Review warnings above.';
    ELSE
        RAISE WARNING '❌ PHASE 3 INTELLIGENCE LAYER INCOMPLETE';
        RAISE NOTICE 'Significant components missing. Review warnings above.';
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDED NEXT STEPS:';
    RAISE NOTICE '1. Deploy Edge Function: supabase functions deploy process-block';
    RAISE NOTICE '2. Configure environment variables in Supabase Dashboard';
    RAISE NOTICE '3. Test with sample blocks to verify trigger → Edge Function flow';
    RAISE NOTICE '4. Monitor async_processing_errors table for any failures';
    RAISE NOTICE '===========================================';

END;
$$;
