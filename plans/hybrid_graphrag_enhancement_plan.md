# Hybrid GraphRAG Enhancement Plan

## Objective
Enhance the semantic_memory schema for efficient hybrid retrieval with partial HNSW indexes and optimized graph traversal.

## Current Schema Analysis
- `semantic_memory.entities`: Has embedding VECTOR(1536), but missing workspace_id and is_active columns
- `semantic_memory.entity_relationships`: Has weight, but missing traversal_priority column
- No partial HNSW index exists
- No workspace-filtered indexes for hybrid search

## Required Changes

### 1. Schema Modifications
- Add `workspace_id UUID` to entities table (references workspaces(id))
- Add `is_active BOOLEAN DEFAULT true` to entities table
- Add `traversal_priority INT DEFAULT 0` to entity_relationships table

### 2. Index Creation
- Partial HNSW index: `idx_entities_embedding_hnsw_partial` on (embedding) WHERE is_active = true
- Composite workspace index: `idx_entities_workspace_embedding` on (workspace_id, is_active) INCLUDE (id, name, entity_type, embedding)
- Bidirectional relationship indexes:
  - `idx_relationships_source_target` on (source_entity_id, target_entity_id, relationship_type) WHERE is_active = true
  - `idx_relationships_target_source` on (target_entity_id, source_entity_id, relationship_type) WHERE is_active = true

### 3. Helper Function
- `extract_query_entities()`: Extracts entity mentions from query text using similarity matching

### 4. Optimization
- ANALYZE tables for query planner
- Verification queries to confirm indexes exist

## Implementation Steps

1. Create migration file: `database/migrations/phase1/014_hybrid_graphrag_indexes.sql`
2. Execute ALTER TABLE statements to add missing columns
3. Create partial HNSW index with WHERE clause
4. Create composite and relationship indexes
5. Create the helper function
6. Run ANALYZE and verification

## Success Criteria
- Partial HNSW index created with `is_active = true` filter
- Composite workspace index exists
- Bidirectional relationship indexes created
- `extract_query_entities` function deployed
- All indexes visible in pg_indexes query