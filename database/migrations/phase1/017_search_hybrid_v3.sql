-- Migration: 20250122_search_hybrid_v3.sql
-- Purpose: Complete hybrid GraphRAG with RRF fusion of vector and graph search results

CREATE OR REPLACE FUNCTION semantic_memory.search_hybrid_v3(
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_workspace_id UUID,
    p_vector_limit INT DEFAULT 20,
    p_graph_depth INT DEFAULT 2,
    p_rrf_k INT DEFAULT 60,
    p_final_limit INT DEFAULT 25
)
RETURNS TABLE(
    entity_id UUID,
    entity_name TEXT,
    entity_type TEXT,
    content TEXT,
    rrf_score FLOAT,
    vector_rank INT,
    graph_rank INT,
    hop_distance INT,
    retrieval_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = semantic_memory, public
AS $$
DECLARE
    v_seed_entities UUID[];
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
    WITH
    -- Step 1: Execute Vector Search
    vector_results AS (
        SELECT
            sv.entity_id,
            sv.entity_name,
            sv.entity_type,
            sv.content,
            sv.similarity_score,
            sv.vector_rank
        FROM semantic_memory.search_vector_v3(
            p_query_embedding,
            p_workspace_id,
            p_vector_limit,
            0.65  -- Slightly lower threshold for fusion
        ) sv
    ),

    -- Step 2: Extract seed entities for graph expansion
    -- Combine: top vector results + entities mentioned in query
    seed_entities AS (
        SELECT DISTINCT seed_id
        FROM (
            -- Top 5 vector results as seeds
            SELECT entity_id AS seed_id
            FROM vector_results
            ORDER BY vector_rank
            LIMIT 5

            UNION

            -- Entities explicitly mentioned in query
            SELECT entity_id AS seed_id
            FROM semantic_memory.extract_query_entities(p_query_text, p_workspace_id)
            LIMIT 5
        ) seeds
    ),

    -- Step 3: Execute Graph Expansion (if we have seeds)
    graph_results AS (
        SELECT
            ge.entity_id,
            ge.entity_name,
            ge.entity_type,
            ge.content,
            ge.hop_distance,
            ge.graph_rank
        FROM semantic_memory.search_graph_expansion_v3(
            (SELECT array_agg(seed_id) FROM seed_entities),
            p_workspace_id,
            p_graph_depth,
            15,  -- limit per hop
            30   -- graph result limit
        ) ge
        WHERE EXISTS (SELECT 1 FROM seed_entities)  -- Only if we have seeds
    ),

    -- Step 4: Unify results from both systems
    unified_results AS (
        -- Vector-only results
        SELECT
            vr.entity_id,
            vr.entity_name,
            vr.entity_type,
            vr.content,
            vr.vector_rank,
            NULL::INT AS graph_rank,
            NULL::INT AS hop_distance,
            'vector'::TEXT AS source
        FROM vector_results vr
        WHERE NOT EXISTS (
            SELECT 1 FROM graph_results gr WHERE gr.entity_id = vr.entity_id
        )

        UNION ALL

        -- Graph-only results
        SELECT
            gr.entity_id,
            gr.entity_name,
            gr.entity_type,
            gr.content,
            NULL::INT AS vector_rank,
            gr.graph_rank,
            gr.hop_distance,
            'graph'::TEXT AS source
        FROM graph_results gr
        WHERE NOT EXISTS (
            SELECT 1 FROM vector_results vr WHERE vr.entity_id = gr.entity_id
        )

        UNION ALL

        -- Both systems (intersection) - highest priority
        SELECT
            vr.entity_id,
            vr.entity_name,
            vr.entity_type,
            vr.content,
            vr.vector_rank,
            gr.graph_rank,
            gr.hop_distance,
            'both'::TEXT AS source
        FROM vector_results vr
        JOIN graph_results gr ON gr.entity_id = vr.entity_id
    ),

    -- Step 5: Apply Reciprocal Rank Fusion
    rrf_scored AS (
        SELECT
            ur.*,
            -- RRF Formula: sum of reciprocal ranks with k=60
            COALESCE(1.0 / (p_rrf_k + ur.vector_rank), 0) +
            COALESCE(1.0 / (p_rrf_k + ur.graph_rank), 0) AS rrf_score
        FROM unified_results ur
    )

    -- Step 6: Return final ranked results
    SELECT
        rs.entity_id,
        rs.entity_name,
        rs.entity_type,
        rs.content,
        rs.rrf_score,
        rs.vector_rank,
        rs.graph_rank,
        rs.hop_distance,
        rs.source
    FROM rrf_scored rs
    ORDER BY rs.rrf_score DESC
    LIMIT p_final_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION semantic_memory.search_hybrid_v3 TO authenticated;