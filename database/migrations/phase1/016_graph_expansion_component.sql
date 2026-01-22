-- Migration: 20250122_graph_expansion_component.sql
-- Purpose: Create graph expansion RPC for System 2 analytical retrieval

CREATE OR REPLACE FUNCTION semantic_memory.search_graph_expansion_v3(
    p_seed_entity_ids UUID[],
    p_workspace_id UUID,
    p_max_depth INT DEFAULT 2,
    p_limit_per_hop INT DEFAULT 15,
    p_final_limit INT DEFAULT 30
)
RETURNS TABLE(
    entity_id UUID,
    entity_name TEXT,
    entity_type TEXT,
    content TEXT,
    hop_distance INT,
    traversal_path UUID[],
    relationship_chain TEXT[],
    graph_rank INT
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
    WITH RECURSIVE graph_traversal AS (
        -- Base case: seed entities (hop 0)
        SELECT
            e.id,
            e.canonical_name,
            e.entity_type,
            COALESCE(e.description, '') as content,
            0 AS depth,
            ARRAY[e.id] AS path,
            ARRAY[]::TEXT[] AS rel_chain,
            1.0 AS path_weight
        FROM semantic_memory.entities e
        WHERE e.id = ANY(p_seed_entity_ids)
          AND e.workspace_id = p_workspace_id
          AND e.is_active = true

        UNION ALL

        -- Recursive case: expand neighbors
        SELECT
            e.id,
            e.canonical_name,
            e.entity_type,
            COALESCE(e.description, '') as content,
            gt.depth + 1,
            gt.path || e.id,
            gt.rel_chain || r.relationship_type,
            gt.path_weight * COALESCE(r.weight, 1.0) * 0.7  -- Decay factor
        FROM graph_traversal gt
        JOIN semantic_memory.entity_relationships r
            ON (r.source_entity_id = gt.id OR r.target_entity_id = gt.id)
            AND r.is_active = true
        JOIN semantic_memory.entities e
            ON e.id = CASE
                WHEN r.source_entity_id = gt.id THEN r.target_entity_id
                ELSE r.source_entity_id
            END
            AND e.workspace_id = p_workspace_id
            AND e.is_active = true
            AND NOT (e.id = ANY(gt.path))  -- Prevent cycles
        WHERE gt.depth < p_max_depth
    ),

    -- Deduplicate and rank by path weight
    ranked_traversal AS (
        SELECT DISTINCT ON (gt.id)
            gt.id,
            gt.canonical_name,
            gt.entity_type,
            gt.content,
            gt.depth,
            gt.path,
            gt.rel_chain,
            gt.path_weight,
            ROW_NUMBER() OVER (
                PARTITION BY gt.depth
                ORDER BY gt.path_weight DESC
            ) AS hop_rank
        FROM graph_traversal gt
        WHERE gt.depth > 0  -- Exclude seed entities from results
        ORDER BY gt.id, gt.path_weight DESC
    ),

    -- Apply per-hop limits
    limited_results AS (
        SELECT *
        FROM ranked_traversal rt
        WHERE rt.hop_rank <= p_limit_per_hop
    ),

    -- Final ranking
    final_ranked AS (
        SELECT
            lr.*,
            ROW_NUMBER() OVER (
                ORDER BY lr.depth ASC, lr.path_weight DESC
            )::INT AS final_rank
        FROM limited_results lr
    )

    SELECT
        fr.id,
        fr.canonical_name,
        fr.entity_type,
        fr.content,
        fr.depth,
        fr.path,
        fr.rel_chain,
        fr.final_rank
    FROM final_ranked fr
    ORDER BY fr.final_rank
    LIMIT p_final_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION semantic_memory.search_graph_expansion_v3 TO authenticated;

-- Create explosion control monitoring view
CREATE OR REPLACE VIEW semantic_memory.graph_expansion_stats AS
SELECT
    e.workspace_id,
    COUNT(*) AS total_entities,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM semantic_memory.entity_relationships r
        WHERE r.source_entity_id = e.id OR r.target_entity_id = e.id
    )) AS connected_entities,
    (SELECT COUNT(*) FROM semantic_memory.entity_relationships r
     WHERE r.source_entity_id IN (SELECT id FROM semantic_memory.entities WHERE workspace_id = e.workspace_id)
    ) AS total_relationships,
    ROUND(
        (SELECT COUNT(*)::NUMERIC FROM semantic_memory.entity_relationships r
         WHERE r.source_entity_id IN (SELECT id FROM semantic_memory.entities WHERE workspace_id = e.workspace_id)
        ) / NULLIF(COUNT(*), 0), 2
    ) AS avg_relationships_per_entity
FROM semantic_memory.entities e
WHERE e.is_active = true
GROUP BY e.workspace_id;

GRANT SELECT ON semantic_memory.graph_expansion_stats TO authenticated;