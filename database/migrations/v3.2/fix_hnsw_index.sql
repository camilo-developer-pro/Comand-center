-- Fix for HNSW index: Make it partial (WHERE embedding IS NOT NULL)
-- This addresses Test 3 failure in Phase 1 verification

-- First, check if the index exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_embedding_hnsw'
  ) THEN
    -- Check if it's already partial
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'blocks_v3'
      AND indexname = 'idx_blocks_v3_embedding_hnsw'
      AND indexdef LIKE '%WHERE embedding IS NOT NULL%'
    ) THEN
      RAISE NOTICE 'Dropping non-partial HNSW index...';
      DROP INDEX IF EXISTS idx_blocks_v3_embedding_hnsw;
      
      RAISE NOTICE 'Creating partial HNSW index...';
      CREATE INDEX idx_blocks_v3_embedding_hnsw 
        ON public.blocks_v3 USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        WHERE embedding IS NOT NULL;
        
      RAISE NOTICE '✅ HNSW index recreated as partial index (excludes NULL embeddings)';
    ELSE
      RAISE NOTICE '✅ HNSW index is already partial (WHERE embedding IS NOT NULL)';
    END IF;
  ELSE
    RAISE NOTICE '❌ HNSW index does not exist. Creating it...';
    CREATE INDEX idx_blocks_v3_embedding_hnsw 
      ON public.blocks_v3 USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
      WHERE embedding IS NOT NULL;
      
    RAISE NOTICE '✅ HNSW index created as partial index';
  END IF;
END $$;

-- Verify the fix
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'blocks_v3'
    AND indexname = 'idx_blocks_v3_embedding_hnsw'
    AND indexdef LIKE '%WHERE embedding IS NOT NULL%'
  ) THEN
    RAISE NOTICE '✅ Verification: HNSW index is now correctly partial';
  ELSE
    RAISE WARNING '❌ Verification: HNSW index still not partial';
  END IF;
END $$;