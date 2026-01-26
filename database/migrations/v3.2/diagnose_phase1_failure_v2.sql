-- Phase 1 Verification Diagnostic v2
-- Returns results as a query table instead of NOTICE messages

WITH test_results AS (
  -- Test 1: blocks_v3 table exists
  SELECT 
    1 as test_id,
    'blocks_v3 table exists' as test_name,
    EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'blocks_v3'
    ) as passed,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocks_v3')
      THEN '✅ PASS'
      ELSE '❌ FAIL: Run 001_blocks_schema.sql migration'
    END as result
  UNION ALL
  
  -- Test 2: block_type ENUM exists with values
  SELECT 
    2,
    'block_type ENUM with values',
    EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'block_type'
      AND e.enumlabel IN ('page', 'text', 'heading', 'task', 'code', 'quote', 'divider', 'image', 'table')
    ),
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_type') THEN
        CASE WHEN EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'block_type'
          AND e.enumlabel IN ('page', 'text', 'heading', 'task', 'code', 'quote', 'divider', 'image', 'table')
        ) THEN '✅ PASS'
        ELSE '❌ FAIL: ENUM exists but missing values - recreate in 001_blocks_schema.sql'
        END
      ELSE '❌ FAIL: ENUM missing - run 001_blocks_schema.sql'
    END
  UNION ALL
  
  -- Test 3: HNSW index exists (partial)
  SELECT
    3,
    'HNSW embedding index (partial)',
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'blocks_v3'
      AND indexname = 'idx_blocks_v3_embedding_hnsw'
      AND (
        indexdef LIKE '%WHERE embedding IS NOT NULL%' OR
        indexdef LIKE '%WHERE (embedding IS NOT NULL)%'
      )
    ),
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'blocks_v3'
        AND indexname = 'idx_blocks_v3_embedding_hnsw'
      ) THEN
        CASE WHEN EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public'
          AND tablename = 'blocks_v3'
          AND indexname = 'idx_blocks_v3_embedding_hnsw'
          AND (
            indexdef LIKE '%WHERE embedding IS NOT NULL%' OR
            indexdef LIKE '%WHERE (embedding IS NOT NULL)%'
          )
        ) THEN '✅ PASS'
        ELSE '❌ FAIL: Index exists but not partial - recreate with WHERE embedding IS NOT NULL'
        END
      ELSE '❌ FAIL: Index missing - run 001_blocks_schema.sql, ensure pgvector extension'
    END
  UNION ALL
  
  -- Test 4: Path GIST index
  SELECT 
    4,
    'Path GIST index',
    EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'blocks_v3'
      AND indexname = 'idx_blocks_v3_path_gist'
    ),
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'blocks_v3'
        AND indexname = 'idx_blocks_v3_path_gist'
      ) THEN '✅ PASS'
      ELSE '❌ FAIL: Index missing - run 001_blocks_schema.sql, ensure ltree extension'
    END
  UNION ALL
  
  -- Test 5: RLS enabled
  SELECT 
    5,
    'RLS enabled on blocks_v3',
    COALESCE((
      SELECT rowsecurity 
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'blocks_v3'
    ), false),
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocks_v3') THEN
        CASE WHEN (
          SELECT rowsecurity 
          FROM pg_tables
          WHERE schemaname = 'public' AND tablename = 'blocks_v3'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL: RLS not enabled - run 003_blocks_rls.sql'
        END
      ELSE '❌ FAIL: blocks_v3 table not found in pg_tables'
    END
  UNION ALL
  
  -- Test 6: Fractional indexing function
  SELECT 
    6,
    'fi_generate_key_between() function',
    EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'fi_generate_key_between'
    ),
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fi_generate_key_between')
      THEN '✅ PASS'
      ELSE '❌ FAIL: Function missing - run phase1/005c_fi_generate_key.sql'
    END
  UNION ALL
  
  -- Test 7: Path trigger
  SELECT 
    7,
    'blocks_path_sync trigger',
    EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND c.relname = 'blocks_v3'
      AND t.tgname = 'blocks_path_sync'
    ),
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'blocks_v3'
        AND t.tgname = 'blocks_path_sync'
      ) THEN '✅ PASS'
      ELSE '❌ FAIL: Trigger missing - run 002_blocks_path_trigger.sql'
    END
)
SELECT 
  test_id,
  test_name,
  result,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END as status
FROM test_results
ORDER BY test_id;