-- ============================================================
-- Phase 3 Complete Verification Suite
-- ============================================================

DO $$
DECLARE
    v_test_count INT := 0;
    v_pass_count INT := 0;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Phase 3 Verification Suite';
    RAISE NOTICE '===========================================';

    -- Test 1: Error taxonomy schema
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'error_class') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 1: Error taxonomy enum exists';
    ELSE
        RAISE WARNING '✗ Test 1: Error taxonomy enum missing';
    END IF;

    -- Test 2: Error logs table
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'episodic_memory' AND table_name = 'error_logs') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 2: Error logs table exists';
    ELSE
        RAISE WARNING '✗ Test 2: Error logs table missing';
    END IF;

    -- Test 3: Diagnostic engine function
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'diagnose_error') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 3: Diagnostic engine function exists';
    ELSE
        RAISE WARNING '✗ Test 3: Diagnostic engine function missing';
    END IF;

    -- Test 4: Meta-Agent protocol
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM procedural_memory.protocols
               WHERE name = 'meta_agent_error_handler') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 4: Meta-Agent protocol exists';
    ELSE
        RAISE WARNING '✗ Test 4: Meta-Agent protocol missing';
    END IF;

    -- Test 5: Protocol version history
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'procedural_memory' AND table_name = 'protocol_versions') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 5: Protocol version history exists';
    ELSE
        RAISE WARNING '✗ Test 5: Protocol version history missing';
    END IF;

    -- Test 6: Delta queue table
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'mv_delta_queue') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 6: Delta queue table exists';
    ELSE
        RAISE WARNING '✗ Test 6: Delta queue table missing';
    END IF;

    -- Test 7: Live stats table
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'dashboard_stats_live') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 7: Live stats table exists';
    ELSE
        RAISE WARNING '✗ Test 7: Live stats table missing';
    END IF;

    -- Test 8: Delta capture trigger
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.triggers
               WHERE trigger_name = 'trg_capture_item_delta') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 8: Delta capture trigger exists';
    ELSE
        RAISE WARNING '✗ Test 8: Delta capture trigger missing';
    END IF;

    -- Test 9: Notification functions
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_realtime') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 9: Notification functions exist';
    ELSE
        RAISE WARNING '✗ Test 9: Notification functions missing';
    END IF;

    -- Test 10: Graph change trigger
    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.triggers
               WHERE trigger_name = 'trg_notify_graph_change') THEN
        v_pass_count := v_pass_count + 1;
        RAISE NOTICE '✓ Test 10: Graph change trigger exists';
    ELSE
        RAISE WARNING '✗ Test 10: Graph change trigger missing';
    END IF;

    -- Summary
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Phase 3 Results: %/% tests passed', v_pass_count, v_test_count;
    RAISE NOTICE '===========================================';

    IF v_pass_count < v_test_count THEN
        RAISE WARNING 'Phase 3 verification incomplete: %/% tests passed', v_pass_count, v_test_count;
    ELSE
        RAISE NOTICE 'Phase 3 verification successful: %/% tests passed', v_pass_count, v_test_count;
    END IF;
END;
$$;