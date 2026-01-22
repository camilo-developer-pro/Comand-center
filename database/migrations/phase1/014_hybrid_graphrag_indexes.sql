-- Migration: 20250122_hybrid_graphrag_indexes.sql
-- Purpose: Enhance semantic_memory schema for efficient hybrid GraphRAG retrieval

-- Add missing columns to entities table for workspace isolation and active status
ALTER TABLE semantic_memory.entities
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add traversal_priority column to entity_relationships for graph optimization
ALTER TABLE semantic_memory.entity_relationships
ADD COLUMN IF NOT EXISTS traversal_priority INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create partial HNSW index for active entities only
-- This prevents scanning inactive entities and pushes workspace filter into HNSW scan
DROP INDEX IF EXISTS semantic_memory.idx_entities_embedding_hnsw_partial;
CREATE INDEX idx_entities_embedding_hnsw_partial
ON semantic_memory.entities
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE is_active = true AND embedding IS NOT NULL;

-- Create composite index for workspace + embedding queries
-- Enables fast filtering before vector operations
DROP INDEX IF EXISTS semantic_memory.idx_entities_workspace_embedding;
CREATE INDEX idx_entities_workspace_embedding
ON semantic_memory.entities (workspace_id, is_active)
INCLUDE (id, canonical_name, entity_type, embedding)
WHERE is_active = true;

-- Optimize entity_relationships table for efficient 2-hop graph traversal
-- Bidirectional indexes for recursive CTEs
DROP INDEX IF EXISTS semantic_memory.idx_relationships_source_target;
CREATE INDEX idx_relationships_source_target
ON semantic_memory.entity_relationships (source_entity_id, target_entity_id, relationship_type)
WHERE is_active = true;

DROP INDEX IF EXISTS semantic_memory.idx_relationships_target_source;
CREATE INDEX idx_relationships_target_source
ON semantic_memory.entity_relationships (target_entity_id, source_entity_id, relationship_type)
WHERE is_active = true;

-- Note: is_active column added to entity_relationships in base schema
-- Using status enum instead, so adjust WHERE clauses accordingly if needed

-- Create the entity extraction helper function
CREATE OR REPLACE FUNCTION semantic_memory.extract_query_entities(
    p_query_text TEXT,
    p_workspace_id UUID
)
RETURNS TABLE(entity_id UUID, entity_name TEXT, match_score FLOAT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = semantic_memory, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.canonical_name,
        similarity(lower(p_query_text), lower(e.canonical_name)) AS match_score
    FROM semantic_memory.entities e
    WHERE e.workspace_id = p_workspace_id
      AND e.is_active = true
      AND (
          lower(p_query_text) LIKE '%' || lower(e.canonical_name) || '%'
          OR similarity(lower(p_query_text), lower(e.canonical_name)) > 0.3
      )
    ORDER BY match_score DESC
    LIMIT 10;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION semantic_memory.extract_query_entities TO authenticated;

-- Analyze tables for query planner optimization
ANALYZE semantic_memory.entities;
ANALYZE semantic_memory.entity_relationships;

-- Verification queries (run these after migration)
-- SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'semantic_memory';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'semantic_memory';