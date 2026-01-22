# Vector Search Component Plan

## Objective
Implement the vector search RPC for System 1 (fast/intuitive) semantic retrieval in hybrid GraphRAG.

## Schema Analysis
- `semantic_memory.entities` has:
  - `canonical_name` (TEXT NOT NULL) - not `name`
  - `description` (TEXT) - not `content`
  - `status` (entity_status enum) - we added `is_active` BOOLEAN
  - `embedding` VECTOR(1536)
  - `workspace_id` (added in previous enhancement)

## Required Changes
1. Create `search_vector_v3` function using correct column names
2. Create `search_vector_v3_text` overload with entity extraction
3. Create TypeScript types file
4. Create verification SQL

## Implementation Plan
- Use `canonical_name` instead of `name`
- Use `description` instead of `content`
- Use `is_active = true` (added in previous migration)
- Use `workspace_id` for multi-tenant isolation
- Leverage partial HNSW index created in previous enhancement