-- Direct fix for HNSW index partial issue
-- Drop and recreate with explicit WHERE clause

-- First, let's see the current index definition
SELECT 
  indexname,
  indexdef,
  CASE WHEN indexdef LIKE '%WHERE%' THEN 'Has WHERE clause' ELSE 'No WHERE clause' END as has_where
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'blocks_v3'
AND indexname = 'idx_blocks_v3_embedding_hnsw';

-- Now drop the index if it exists
DROP INDEX IF EXISTS idx_blocks_v3_embedding_hnsw;

-- Create the index with explicit WHERE embedding IS NOT NULL
CREATE INDEX idx_blocks_v3_embedding_hnsw 
  ON public.blocks_v3 USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- Verify the new index
SELECT 
  indexname,
  indexdef,
  CASE WHEN indexdef LIKE '%WHERE embedding IS NOT NULL%' THEN '✅ Correct partial index' 
       WHEN indexdef LIKE '%WHERE%' THEN '⚠️ Has WHERE but different'
       ELSE '❌ No WHERE clause' END as verification
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'blocks_v3'
AND indexname = 'idx_blocks_v3_embedding_hnsw';