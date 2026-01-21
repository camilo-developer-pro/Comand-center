-- ============================================
-- GRAPH NEIGHBORHOOD TRAVERSAL (Entity Edges)
-- ============================================
-- Migration: 20250121_001_get_graph_neighborhood.sql
-- Description: Traverses knowledge graph using entity_edges table (polymorphic edge table)
-- Supports bidirectional traversal across documents, items, leads, users, and tasks

CREATE OR REPLACE FUNCTION get_graph_neighborhood(
    anchor_ids uuid[],
    depth int DEFAULT 2,
    p_workspace_id uuid DEFAULT NULL,
    p_entity_types text[] DEFAULT ARRAY['document', 'item', 'lead', 'user', 'task']
)
RETURNS TABLE (
    entity_id uuid,
    entity_type text,
    hop_distance int,
    relation_type text,
    path uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate workspace_id
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'workspace_id cannot be NULL for graph traversal';
    END IF;

    RETURN QUERY
    WITH RECURSIVE graph_traversal AS (
        -- Base case: direct connections FROM anchor nodes (outgoing edges)
        SELECT 
            ee.target_id AS entity_id,
            ee.target_type AS entity_type,
            1 AS hop_distance,
            ee.relation_type,
            ARRAY[ee.source_id, ee.target_id] AS path
        FROM entity_edges ee
        WHERE ee.source_id = ANY(anchor_ids)
          AND ee.workspace_id = p_workspace_id
          AND ee.target_type = ANY(p_entity_types)
        
        UNION ALL
        
        -- Base case: direct connections TO anchor nodes (incoming edges - reverse traversal)
        SELECT 
            ee.source_id AS entity_id,
            ee.source_type AS entity_type,
            1 AS hop_distance,
            ee.relation_type,
            ARRAY[ee.target_id, ee.source_id] AS path
        FROM entity_edges ee
        WHERE ee.target_id = ANY(anchor_ids)
          AND ee.workspace_id = p_workspace_id
          AND ee.source_type = ANY(p_entity_types)
        
        UNION ALL
        
        -- Recursive case: traverse outward (source → target)
        SELECT 
            ee.target_id AS entity_id,
            ee.target_type AS entity_type,
            gt.hop_distance + 1 AS hop_distance,
            ee.relation_type,
            gt.path || ee.target_id AS path
        FROM graph_traversal gt
        JOIN entity_edges ee ON ee.source_id = gt.entity_id
        WHERE gt.hop_distance < depth
          AND NOT (ee.target_id = ANY(gt.path))  -- Prevent cycles
          AND ee.workspace_id = p_workspace_id   -- Security: workspace isolation
          AND ee.target_type = ANY(p_entity_types)
        
        UNION ALL
        
        -- Recursive case: traverse inward (target → source)
        SELECT 
            ee.source_id AS entity_id,
            ee.source_type AS entity_type,
            gt.hop_distance + 1 AS hop_distance,
            ee.relation_type,
            gt.path || ee.source_id AS path
        FROM graph_traversal gt
        JOIN entity_edges ee ON ee.target_id = gt.entity_id
        WHERE gt.hop_distance < depth
          AND NOT (ee.source_id = ANY(gt.path))  -- Prevent cycles
          AND ee.workspace_id = p_workspace_id   -- Security: workspace isolation
          AND ee.source_type = ANY(p_entity_types)
    )
    SELECT DISTINCT ON (gt.entity_id)
        gt.entity_id,
        gt.entity_type,
        gt.hop_distance,
        gt.relation_type,
        gt.path
    FROM graph_traversal gt
    WHERE gt.entity_id != ALL(anchor_ids)  -- Exclude anchor nodes from results
    ORDER BY gt.entity_id, gt.hop_distance ASC;  -- Keep shortest path per node
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_graph_neighborhood(uuid[], int, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_graph_neighborhood(uuid[], int, uuid, text[]) TO service_role;

-- Documentation
COMMENT ON FUNCTION get_graph_neighborhood(uuid[], int, uuid, text[]) IS 
'Traverses knowledge graph bidirectionally from anchor nodes up to specified depth.
Uses entity_edges table for polymorphic graph relationships.
Security: workspace_id is enforced at every traversal step.
Parameters:
- anchor_ids: Starting node UUIDs
- depth: Maximum hops (default 2)
- p_workspace_id: REQUIRED workspace isolation
- p_entity_types: Filter by entity types (default all)';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
/*
-- Test with a known document ID
SELECT * FROM get_graph_neighborhood(
    ARRAY['<test-document-uuid>'::uuid],
    2,
    '<test-workspace-uuid>'::uuid,
    ARRAY['document', 'item']
);

-- Test bidirectional traversal
SELECT * FROM get_graph_neighborhood(
    ARRAY['<test-item-uuid>'::uuid],
    1,
    '<test-workspace-uuid>'::uuid,
    ARRAY['document', 'lead', 'user']
);
*/
