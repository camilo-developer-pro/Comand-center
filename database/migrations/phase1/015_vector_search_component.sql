-- Migration: 20250122_vector_search_component.sql
-- Purpose: Create vector search RPC for System 1 semantic retrieval in hybrid GraphRAG

CREATE OR REPLACE FUNCTION semantic_memory.search_vector_v3(
    p_query_embedding vector(1536),
    p_workspace_id UUID,
    p_limit INT DEFAULT 20,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
    entity_id UUID,
    entity_name TEXT,
    entity_type TEXT,
    content TEXT,
    similarity_score FLOAT,
    vector_rank INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = semantic_memory, public
AS $$
BEGIN
    -- Validate workspace access
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
    END IF;

    RETURN QUERY
    WITH ranked_results AS (
        SELECT
            e.id,
            e.canonical_name,
            e.entity_type,
            COALESCE(e.description, '') as content,
            1 - (e.embedding <=> p_query_embedding) AS similarity,
            ROW_NUMBER() OVER (
                ORDER BY e.embedding <=> p_query_embedding
            )::INT AS rank
        FROM semantic_memory.entities e
        WHERE e.workspace_id = p_workspace_id
          AND e.is_active = true
          AND e.embedding IS NOT NULL
        ORDER BY e.embedding <=> p_query_embedding
        LIMIT p_limit * 2  -- Fetch extra for post-filtering
    )
    SELECT
        r.id,
        r.canonical_name,
        r.entity_type,
        r.content,
        r.similarity,
        r.rank
    FROM ranked_results r
    WHERE r.similarity >= p_similarity_threshold
    LIMIT p_limit;
END;
$$;

-- Create overload for text query with entity extraction
CREATE OR REPLACE FUNCTION semantic_memory.search_vector_v3_text(
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_workspace_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE(
    entity_id UUID,
    entity_name TEXT,
    entity_type TEXT,
    content TEXT,
    similarity_score FLOAT,
    vector_rank INT,
    query_entities UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = semantic_memory, public
AS $$
DECLARE
    v_extracted_entities UUID[];
BEGIN
    -- Validate workspace access
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = p_workspace_id
          AND wm.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
    END IF;

    -- Extract entity mentions from query
    SELECT ARRAY_AGG(entity_id) INTO v_extracted_entities
    FROM semantic_memory.extract_query_entities(p_query_text, p_workspace_id);

    RETURN QUERY
    SELECT
        sv.entity_id,
        sv.entity_name,
        sv.entity_type,
        sv.content,
        sv.similarity_score,
        sv.vector_rank,
        COALESCE(v_extracted_entities, ARRAY[]::UUID[]) AS query_entities
    FROM semantic_memory.search_vector_v3(
        p_query_embedding,
        p_workspace_id,
        p_limit,
        0.7
    ) sv;
END;
$$;

GRANT EXECUTE ON FUNCTION semantic_memory.search_vector_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION semantic_memory.search_vector_v3_text TO authenticated;