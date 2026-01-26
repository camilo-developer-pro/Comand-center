-- V3.2 Phase 1 Verification Suite
-- Run after all Phase 1 migrations
-- Verifies that all critical Phase 1 components are correctly deployed

DO $$
DECLARE
  v_test_count INT := 0;
  v_pass_count INT := 0;
  v_rls_enabled BOOLEAN;
  v_failed_tests TEXT[] := '{}';
BEGIN
  RAISE NOTICE '🧪 V3.2 Phase 1 Verification Starting...';
  RAISE NOTICE '';

  -- Test 1: blocks_v3 table exists
  v_test_count := v_test_count + 1;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocks_v3') THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE '✅ Test 1: blocks_v3 table exists';
  ELSE
    RAISE NOTICE '❌ Test 1: blocks_v3 table MISSING';
    v_failed_tests := array_append(v_failed_tests, '1: blocks_v3 table');
  END IF;

  -- Test 2: block_type ENUM exists with correct values
  v_test_count := v_test_count + 1;
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'block_type'
  ) THEN
    -- Check that it has the expected values
    IF EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'block_type')
      AND enumlabel IN ('page', 'text', 'heading', 'task', 'code', 'quote', 'divider', 'image', 'table')
    ) THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ Test 2: block_type ENUM exists with correct values';
    ELSE
      RAISE NOTICE '❌ Test 2: block_type ENUM exists but missing expected values';
      v_failed_tests := array_append(v_failed_tests, '2: block_type ENUM values');
    END IF;
  ELSE
    RAISE NOTICE '❌ Test 2: block_type ENUM MISSING';
    v_failed_tests := array_append(v_failed_tests, '2: block_type ENUM');
  END IF;

  -- Test 3: HNSW index on embedding (partial)
  v_test_count := v_test_count + 1;
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_embedding_hnsw'
  ) THEN
    -- Verify it's a partial index (excludes NULL embeddings)
    -- Accept both "WHERE embedding IS NOT NULL" and "WHERE (embedding IS NOT NULL)"
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'blocks_v3'
      AND indexname = 'idx_blocks_v3_embedding_hnsw'
      AND (
        indexdef LIKE '%WHERE embedding IS NOT NULL%' OR
        indexdef LIKE '%WHERE (embedding IS NOT NULL)%'
      )
    ) THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE '✅ Test 3: HNSW embedding index exists (partial)';
    ELSE
      RAISE NOTICE '❌ Test 3: HNSW embedding index exists but NOT partial';
      v_failed_tests := array_append(v_failed_tests, '3: HNSW index partial constraint');
    END IF;
  ELSE
    RAISE NOTICE '❌ Test 3: HNSW embedding index MISSING';
    v_failed_tests := array_append(v_failed_tests, '3: HNSW embedding index');
  END IF;

  -- Test 4: ltree path GIST index
  v_test_count := v_test_count + 1;
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_path_gist'
  ) THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE '✅ Test 4: Path GIST index exists';
  ELSE
    RAISE NOTICE '❌ Test 4: Path GIST index MISSING';
    v_failed_tests := array_append(v_failed_tests, '4: Path GIST index');
  END IF;

  -- Test 5: RLS enabled on blocks_v3
  v_test_count := v_test_count + 1;
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'blocks_v3';
  
  IF v_rls_enabled THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE '✅ Test 5: RLS enabled on blocks_v3';
  ELSIF v_rls_enabled IS FALSE THEN
    RAISE NOTICE '❌ Test 5: RLS NOT enabled on blocks_v3 (rowsecurity = false)';
    v_failed_tests := array_append(v_failed_tests, '5: RLS enabled');
  ELSE
    RAISE NOTICE '❌ Test 5: blocks_v3 not found in pg_tables view';
    v_failed_tests := array_append(v_failed_tests, '5: blocks_v3 in pg_tables');
  END IF;

  -- Test 6: Fractional indexing function available
  v_test_count := v_test_count + 1;
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fi_generate_key_between'
  ) THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE '✅ Test 6: fi_generate_key_between() exists';
  ELSE
    RAISE NOTICE '❌ Test 6: fi_generate_key_between() MISSING';
    v_failed_tests := array_append(v_failed_tests, '6: fi_generate_key_between()');
  END IF;

  -- Test 7: Path trigger attached to blocks_v3
  v_test_count := v_test_count + 1;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'blocks_v3'
    AND t.tgname = 'blocks_path_sync'
  ) THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE '✅ Test 7: Path sync trigger attached to blocks_v3';
  ELSE
    RAISE NOTICE '❌ Test 7: Path sync trigger MISSING on blocks_v3';
    v_failed_tests := array_append(v_failed_tests, '7: blocks_path_sync trigger');
  END IF;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Results: % / % tests passed', v_pass_count, v_test_count;
  
  IF array_length(v_failed_tests, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ Failed tests:';
    FOR i IN 1..array_length(v_failed_tests, 1) LOOP
      RAISE NOTICE '   - Test %', v_failed_tests[i];
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Ensure all Phase 1 migrations have been run:';
    RAISE NOTICE '      - 001_blocks_schema.sql';
    RAISE NOTICE '      - 002_blocks_path_trigger.sql';
    RAISE NOTICE '      - 003_blocks_rls.sql';
    RAISE NOTICE '   2. Check that required extensions are installed:';
    RAISE NOTICE '      - pgvector (for HNSW index)';
    RAISE NOTICE '      - ltree (for path hierarchy)';
    RAISE NOTICE '   3. Verify fractional indexing functions from phase1/005_*.sql';
    
    -- Also raise as WARNING which might be more visible
    RAISE WARNING 'V3.2 Phase 1 Verification: % tests failed. Failed tests: %',
      (v_test_count - v_pass_count),
      array_to_string(v_failed_tests, ', ');
  END IF;
  
  IF v_pass_count = v_test_count THEN
    RAISE NOTICE '🎉 V3.2 Phase 1 Verification COMPLETE!';
  ELSE
    RAISE EXCEPTION '❌ V3.2 Phase 1 Verification FAILED: % tests did not pass. Check NOTICE messages above for details and run missing Phase 1 migrations.', (v_test_count - v_pass_count);
  END IF;
END $$;
