-- ============================================
-- HYBRID SEARCH FUNCTION (Vector + Graph + RRF)
-- ============================================
-- Migration: 20250121_002_search_hybrid.sql
-- Description: Implements hybrid search combining vector similarity and graph ranking.
-- Uses Reciprocal Rank Fusion (RRF) to merge results.

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify HNSW index exists on document_embeddings.embedding
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw 
ON document_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Main hybrid search function
CREATE OR REPLACE FUNCTION search_hybrid(
    query_embedding vector(1536),
    query_text text,
    match_threshold float DEFAULT 0.7,
    p_workspace_id uuid DEFAULT NULL,
    match_count int DEFAULT 20,
    rrf_k int DEFAULT 60
)
RETURNS TABLE (
    document_id uuid,
    document_title text,
    chunk_content text,
    chunk_index int,
    header_path text[],
    similarity_score float,
    graph_score float,
    fusion_score float,
    source_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_query_tsquery tsquery;
BEGIN
    -- ===========================================
    -- VALIDATION
    -- ===========================================
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'workspace_id cannot be NULL';
    END IF;

    -- Pre-compute tsquery for FTS (handle empty query gracefully)
    BEGIN
        v_query_tsquery := websearch_to_tsquery('english', COALESCE(NULLIF(query_text, ''), 'placeholder'));
    EXCEPTION WHEN OTHERS THEN
        v_query_tsquery := plainto_tsquery('english', COALESCE(query_text, ''));
    END;

    -- ===========================================
    -- STEP A: Vector Search on document_embeddings
    -- ===========================================
    CREATE TEMP TABLE vec_results ON COMMIT DROP AS
    WITH ranked_chunks AS (
        SELECT 
            de.document_id,
            de.id AS chunk_id,
            de.content AS chunk_content,
            de.chunk_index,
            de.header_path,
            (1 - (de.embedding <=> query_embedding))::float AS similarity,
            ROW_NUMBER() OVER (
                PARTITION BY de.document_id 
                ORDER BY de.embedding <=> query_embedding ASC
            ) AS chunk_rank_in_doc
        FROM document_embeddings de
        WHERE de.workspace_id = p_workspace_id
          AND de.embedding IS NOT NULL
          AND (1 - (de.embedding <=> query_embedding)) >= match_threshold
    ),
    best_chunks AS (
        -- Keep only the best matching chunk per document
        SELECT *
        FROM ranked_chunks
        WHERE chunk_rank_in_doc = 1
    )
    SELECT 
        bc.document_id,
        bc.chunk_content,
        bc.chunk_index,
        bc.header_path,
        bc.similarity,
        ROW_NUMBER() OVER (ORDER BY bc.similarity DESC)::int AS vec_rank
    FROM best_chunks bc
    ORDER BY bc.similarity DESC
    LIMIT 50;

    -- ===========================================
    -- STEP B: Graph Search via entity_edges
    -- ===========================================
    CREATE TEMP TABLE graph_results ON COMMIT DROP AS
    WITH anchor_documents AS (
        -- Find documents matching query via FTS on chunk content
        SELECT DISTINCT de.document_id AS anchor_id
        FROM document_embeddings de
        WHERE de.workspace_id = p_workspace_id
          AND to_tsvector('english', de.content) @@ v_query_tsquery
        ORDER BY de.document_id
        LIMIT 10
    ),
    graph_expansion AS (
        -- Expand from anchor documents using graph traversal
        SELECT DISTINCT
            gn.entity_id AS document_id,
            MIN(gn.hop_distance) AS hop_distance
        FROM anchor_documents ad
        CROSS JOIN LATERAL get_graph_neighborhood(
            ARRAY[ad.anchor_id],
            2,  -- depth
            p_workspace_id,
            ARRAY['document']  -- Only traverse to documents
        ) gn
        WHERE gn.entity_type = 'document'
        GROUP BY gn.entity_id
    ),
    graph_with_content AS (
        -- Get best chunk for each graph-discovered document
        SELECT 
            ge.document_id,
            de.content AS chunk_content,
            de.chunk_index,
            de.header_path,
            ge.hop_distance,
            ROW_NUMBER() OVER (
                PARTITION BY ge.document_id 
                ORDER BY de.chunk_index ASC
            ) AS chunk_rank
        FROM graph_expansion ge
        JOIN document_embeddings de ON de.document_id = ge.document_id
        WHERE de.workspace_id = p_workspace_id  -- Security: re-verify
    )
    SELECT 
        gwc.document_id,
        gwc.chunk_content,
        gwc.chunk_index,
        gwc.header_path,
        gwc.hop_distance,
        ROW_NUMBER() OVER (ORDER BY gwc.hop_distance ASC)::int AS graph_rank
    FROM graph_with_content gwc
    WHERE gwc.chunk_rank = 1  -- Best chunk per document
    ORDER BY gwc.hop_distance ASC
    LIMIT 50;

    -- ===========================================
    -- STEP C & D: RRF Fusion + Return
    -- ===========================================
    RETURN QUERY
    WITH fused AS (
        SELECT 
            COALESCE(v.document_id, g.document_id) AS document_id,
            COALESCE(v.chunk_content, g.chunk_content) AS chunk_content,
            COALESCE(v.chunk_index, g.chunk_index) AS chunk_index,
            COALESCE(v.header_path, g.header_path) AS header_path,
            v.similarity AS similarity_score,
            CASE 
                WHEN g.hop_distance IS NOT NULL 
                THEN (1.0 / g.hop_distance)::float 
                ELSE NULL 
            END AS graph_score,
            -- RRF Score Calculation
            (
                COALESCE(1.0 / (rrf_k + v.vec_rank), 0) +
                COALESCE(1.0 / (rrf_k + g.graph_rank), 0)
            )::float AS fusion_score,
            -- Source classification
            CASE 
                WHEN v.document_id IS NOT NULL AND g.document_id IS NOT NULL THEN 'hybrid'
                WHEN v.document_id IS NOT NULL THEN 'vector_only'
                ELSE 'graph_only'
            END AS source_type
        FROM vec_results v
        FULL OUTER JOIN graph_results g ON v.document_id = g.document_id
    )
    SELECT 
        f.document_id,
        d.title AS document_title,
        f.chunk_content,
        f.chunk_index,
        f.header_path,
        f.similarity_score,
        f.graph_score,
        f.fusion_score,
        f.source_type
    FROM fused f
    JOIN documents d ON d.id = f.document_id
    WHERE d.workspace_id = p_workspace_id  -- Final security check
    ORDER BY f.fusion_score DESC
    LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_hybrid(vector(1536), text, float, uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION search_hybrid(vector(1536), text, float, uuid, int, int) TO service_role;

-- Documentation
COMMENT ON FUNCTION search_hybrid(vector(1536), text, float, uuid, int, int) IS 
'Hybrid RAG search combining vector similarity (HNSW on document_embeddings) 
with knowledge graph traversal (entity_edges).

Uses Reciprocal Rank Fusion (RRF) to merge results.

Security: workspace_id is enforced at ALL query levels:
- Vector search: document_embeddings.workspace_id
- Anchor selection: document_embeddings.workspace_id  
- Graph traversal: passed to get_graph_neighborhood
- Content retrieval: document_embeddings.workspace_id
- Final join: documents.workspace_id

Parameters:
- query_embedding: 1536-dim vector from embedding model
- query_text: Original text query for FTS anchor extraction  
- match_threshold: Minimum cosine similarity (default 0.7)
- p_workspace_id: REQUIRED workspace isolation
- match_count: Number of results to return (default 20)
- rrf_k: RRF smoothing constant (default 60)

Returns: document_id, title, chunk_content, scores, source_type';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
/*
-- Test 1: Basic hybrid search (replace with actual embedding)
SELECT * FROM search_hybrid(
    (SELECT embedding FROM document_embeddings LIMIT 1),
    'knowledge management documentation',
    0.6,
    '<your-workspace-uuid>'::uuid,
    10,
    60
);

-- Test 2: Check source type distribution
SELECT source_type, COUNT(*) 
FROM search_hybrid(
    (SELECT embedding FROM document_embeddings LIMIT 1),
    'project planning',
    0.5,
    '<your-workspace-uuid>'::uuid,
    50,
    60
)
GROUP BY source_type;

-- Test 3: Verify workspace isolation (should return empty for wrong workspace)
SELECT COUNT(*) FROM search_hybrid(
    (SELECT embedding FROM document_embeddings LIMIT 1),
    'test',
    0.3,
    '00000000-0000-0000-0000-000000000000'::uuid,
    10,
    60
);
-- Expected: 0 results
*/
