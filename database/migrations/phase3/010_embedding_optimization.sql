-- ============================================================================
-- V3.1 Phase 3: Embedding Storage Optimization
-- Migration: 010_embedding_optimization
-- Purpose: Optimize vector search with HNSW index and search functions
-- ============================================================================

-- Ensure embedding column exists with correct dimensions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blocks' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE public.blocks 
        ADD COLUMN embedding vector(1536) DEFAULT NULL;
    END IF;
END;
$$;

-- Drop existing index if present (for recreation with new parameters)
DROP INDEX IF EXISTS idx_blocks_embedding;
DROP INDEX IF EXISTS idx_blocks_embedding_hnsw;

-- Create optimized HNSW index for semantic search
-- Parameters tuned for 1536 dimensions:
--   m = 16 (connections per node, higher = better recall, more memory)
--   ef_construction = 64 (build-time search depth, higher = slower build, better index)
CREATE INDEX idx_blocks_embedding_hnsw
    ON public.blocks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

-- Create partial index for workspace-scoped searches
CREATE INDEX idx_blocks_embedding_workspace
    ON public.blocks(document_id)
    WHERE embedding IS NOT NULL;

-- Function: Semantic block search within workspace
CREATE OR REPLACE FUNCTION public.search_blocks_semantic(
    p_workspace_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
    block_id UUID,
    document_id UUID,
    content JSONB,
    block_type VARCHAR,
    similarity FLOAT,
    document_title VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id AS block_id,
        b.document_id,
        b.content,
        b.type AS block_type,
        1 - (b.embedding <=> p_query_embedding) AS similarity,
        d.title AS document_title
    FROM public.blocks b
    INNER JOIN public.documents d ON d.id = b.document_id
    WHERE d.workspace_id = p_workspace_id
      AND b.embedding IS NOT NULL
      AND 1 - (b.embedding <=> p_query_embedding) > p_similarity_threshold
    ORDER BY b.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get embedding stats for workspace
CREATE OR REPLACE FUNCTION public.get_embedding_stats(
    p_workspace_id UUID
) RETURNS TABLE (
    total_blocks BIGINT,
    embedded_blocks BIGINT,
    pending_blocks BIGINT,
    stale_blocks BIGINT,
    coverage_percent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_blocks,
        COUNT(b.embedding)::BIGINT AS embedded_blocks,
        COUNT(*) FILTER (WHERE b.embedding IS NULL)::BIGINT AS pending_blocks,
        COUNT(*) FILTER (WHERE b.embedding_updated_at < b.updated_at)::BIGINT AS stale_blocks,
        ROUND(COUNT(b.embedding)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) AS coverage_percent
    FROM public.blocks b
    INNER JOIN public.documents d ON d.id = b.document_id
    WHERE d.workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Trigger embedding regeneration for stale blocks
CREATE OR REPLACE FUNCTION public.queue_stale_embeddings(
    p_workspace_id UUID,
    p_limit INTEGER DEFAULT 100
) RETURNS INTEGER AS $$
DECLARE
    queued_count INTEGER := 0;
    block_record RECORD;
    edge_function_url TEXT;
BEGIN
    -- Get Edge Function URL
    SELECT decrypted_secret INTO edge_function_url
    FROM vault.decrypted_secrets
    WHERE name = 'EDGE_FUNCTION_PROCESS_BLOCK_URL';
    
    IF edge_function_url IS NULL THEN
        RAISE NOTICE 'Edge Function URL not configured';
        RETURN 0;
    END IF;
    
    FOR block_record IN 
        SELECT b.id, b.document_id, b.content, b.type, d.workspace_id
        FROM public.blocks b
        INNER JOIN public.documents d ON d.id = b.document_id
        WHERE d.workspace_id = p_workspace_id
          AND (b.embedding IS NULL OR b.embedding_updated_at < b.updated_at)
        ORDER BY b.updated_at DESC
        LIMIT p_limit
    LOOP
        -- Queue via pg_net
        PERFORM net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
            ),
            body := jsonb_build_object(
                'block_id', block_record.id,
                'document_id', block_record.document_id,
                'content', block_record.content,
                'block_type', block_record.type,
                'workspace_id', block_record.workspace_id,
                'trigger_timestamp', NOW(),
                'is_backfill', true
            ),
            timeout_milliseconds := 5000
        );
        
        queued_count := queued_count + 1;
    END LOOP;
    
    RETURN queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_blocks_semantic TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_embedding_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_stale_embeddings TO authenticated;

-- Create view for embedding health monitoring
CREATE OR REPLACE VIEW public.embedding_health AS
SELECT 
    d.workspace_id,
    w.name AS workspace_name,
    COUNT(b.id) AS total_blocks,
    COUNT(b.embedding) AS embedded_blocks,
    COUNT(*) FILTER (WHERE b.embedding IS NULL) AS pending_blocks,
    COUNT(*) FILTER (WHERE b.embedding_updated_at < b.updated_at) AS stale_blocks,
    ROUND(COUNT(b.embedding)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) AS coverage_percent,
    MAX(b.embedding_updated_at) AS last_embedding_update
FROM public.blocks b
INNER JOIN public.documents d ON d.id = b.document_id
INNER JOIN public.workspaces w ON w.id = d.workspace_id
GROUP BY d.workspace_id, w.name;

GRANT SELECT ON public.embedding_health TO authenticated;

COMMENT ON INDEX idx_blocks_embedding_hnsw IS 
'HNSW index for fast approximate nearest neighbor search on block embeddings';

COMMENT ON FUNCTION public.search_blocks_semantic IS
'Performs semantic similarity search on blocks within a workspace using cosine distance';

COMMENT ON FUNCTION public.queue_stale_embeddings IS
'Queues blocks with missing or stale embeddings for reprocessing via Edge Function';
