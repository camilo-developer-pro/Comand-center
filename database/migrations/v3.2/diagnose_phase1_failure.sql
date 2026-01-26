-- Phase 1 Verification Diagnostic
-- Run this to identify which test is failing

DO $$
DECLARE
  v_test_name TEXT;
  v_result BOOLEAN;
  v_details TEXT;
BEGIN
  RAISE NOTICE '=== Phase 1 Verification Diagnostic ===';
  RAISE NOTICE '';

  -- Test 1: blocks_v3 table exists
  v_test_name := 'blocks_v3 table exists';
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'blocks_v3'
  ) INTO v_result;
  
  IF v_result THEN
    RAISE NOTICE '✅ Test 1 PASS: %', v_test_name;
  ELSE
    RAISE NOTICE '❌ Test 1 FAIL: %', v_test_name;
    RAISE NOTICE '   Solution: Run 001_blocks_schema.sql migration';
  END IF;

  -- Test 2: block_type ENUM exists
  v_test_name := 'block_type ENUM exists';
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'block_type'
  ) INTO v_result;
  
  IF v_result THEN
    -- Check values
    SELECT COUNT(*) > 0 INTO v_result
    FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'block_type')
    AND enumlabel IN ('page', 'text', 'heading', 'task', 'code', 'quote', 'divider', 'image', 'table');
    
    IF v_result THEN
      RAISE NOTICE '✅ Test 2 PASS: % with correct values', v_test_name;
    ELSE
      RAISE NOTICE '❌ Test 2 FAIL: % exists but missing expected values', v_test_name;
      RAISE NOTICE '   Solution: Recreate ENUM in 001_blocks_schema.sql';
    END IF;
  ELSE
    RAISE NOTICE '❌ Test 2 FAIL: %', v_test_name;
    RAISE NOTICE '   Solution: Run 001_blocks_schema.sql migration';
  END IF;

  -- Test 3: HNSW index exists
  v_test_name := 'HNSW embedding index exists (partial)';
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_embedding_hnsw'
  ) INTO v_result;
  
  IF v_result THEN
    -- Check if partial
    SELECT indexdef LIKE '%WHERE embedding IS NOT NULL%' INTO v_result
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_embedding_hnsw';
    
    IF v_result THEN
      RAISE NOTICE '✅ Test 3 PASS: %', v_test_name;
    ELSE
      RAISE NOTICE '❌ Test 3 FAIL: HNSW index exists but NOT partial';
      RAISE NOTICE '   Solution: Recreate index with: CREATE INDEX idx_blocks_v3_embedding_hnsw ON blocks_v3 USING hnsw (embedding) WHERE embedding IS NOT NULL';
    END IF;
  ELSE
    RAISE NOTICE '❌ Test 3 FAIL: %', v_test_name;
    RAISE NOTICE '   Solution: Run 001_blocks_schema.sql migration and ensure pgvector extension is installed';
  END IF;

  -- Test 4: Path GIST index exists
  v_test_name := 'Path GIST index exists';
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_path_gist'
  ) INTO v_result;
  
  IF v_result THEN
    RAISE NOTICE '✅ Test 4 PASS: %', v_test_name;
  ELSE
    RAISE NOTICE '❌ Test 4 FAIL: %', v_test_name;
    RAISE NOTICE '   Solution: Run 001_blocks_schema.sql migration and ensure ltree extension is installed';
  END IF;

  -- Test 5: RLS enabled
  v_test_name := 'RLS enabled on blocks_v3';
  DECLARE
    v_rls_enabled BOOLEAN;
  BEGIN
    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'blocks_v3';
    
    IF v_rls_enabled THEN
      RAISE NOTICE '✅ Test 5 PASS: %', v_test_name;
    ELSIF v_rls_enabled IS FALSE THEN
      RAISE NOTICE '❌ Test 5 FAIL: % (rowsecurity = false)', v_test_name;
      RAISE NOTICE '   Solution: Run 003_blocks_rls.sql migration';
    ELSE
      RAISE NOTICE '❌ Test 5 FAIL: blocks_v3 not found in pg_tables view';
      RAISE NOTICE '   Solution: Table may not exist or needs VACUUM ANALYZE';
    END IF;
  END;

  -- Test 6: Fractional indexing function
  v_test_name := 'fi_generate_key_between() exists';
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fi_generate_key_between'
  ) INTO v_result;
  
  IF v_result THEN
    RAISE NOTICE '✅ Test 6 PASS: %', v_test_name;
  ELSE
    RAISE NOTICE '❌ Test 6 FAIL: %', v_test_name;
    RAISE NOTICE '   Solution: Run phase1/005c_fi_generate_key.sql migration';
  END IF;

  -- Test 7: Path trigger
  v_test_name := 'blocks_path_sync trigger exists';
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'blocks_v3'
    AND t.tgname = 'blocks_path_sync'
  ) INTO v_result;
  
  IF v_result THEN
    RAISE NOTICE '✅ Test 7 PASS: %', v_test_name;
  ELSE
    RAISE NOTICE '❌ Test 7 FAIL: %', v_test_name;
    RAISE NOTICE '   Solution: Run 002_blocks_path_trigger.sql migration';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== Diagnostic Complete ===';
  RAISE NOTICE 'Check above for ❌ FAIL messages to identify which test is failing.';
  RAISE NOTICE 'Run the corresponding migration file listed in the Solution.';
END $$;
