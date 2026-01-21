-- ============================================================
-- match_documents RPC
-- 
-- V2.0 Phase 2: Intelligent Editor
--
-- Performs semantic similarity search with MANDATORY workspace filtering.
-- The workspace_id filter is pushed into the query BEFORE similarity
-- calculation to ensure RLS compliance and prevent information leakage.
-- ============================================================

CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    p_workspace_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    header_path TEXT[],
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_variable
BEGIN
    -- SECURITY: Verify the calling user has access to this workspace
    -- This prevents malicious workspace_id injection
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
    END IF;

    RETURN QUERY
    WITH filtered_embeddings AS (
        -- CRITICAL: Filter by workspace_id BEFORE similarity calculation
        -- This ensures we never compute similarity for unauthorized documents
        SELECT 
            de.id,
            de.document_id,
            de.content,
            de.header_path,
            de.embedding,
            de.metadata
        FROM document_embeddings de
        WHERE de.workspace_id = p_workspace_id
    )
    SELECT 
        fe.id,
        fe.document_id,
        fe.content,
        fe.header_path,
        -- Cosine similarity: 1 - cosine_distance
        1 - (fe.embedding <=> query_embedding) AS similarity,
        fe.metadata
    FROM filtered_embeddings fe
    WHERE 1 - (fe.embedding <=> query_embedding) >= match_threshold
    ORDER BY fe.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents(vector(1536), UUID, INT, FLOAT) 
TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION match_documents IS 
'Performs semantic similarity search on document embeddings.
SECURITY: workspace_id filtering is mandatory and happens BEFORE similarity calculation.
This prevents unauthorized access and information leakage.

Parameters:
- query_embedding: 1536-dimensional vector from OpenAI text-embedding-3-small
- p_workspace_id: UUID of the workspace to search (REQUIRED)
- match_count: Maximum number of results to return (default: 5)
- match_threshold: Minimum similarity score 0-1 (default: 0.7)

Returns: id, document_id, content, header_path, similarity, metadata';
