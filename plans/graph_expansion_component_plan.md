# Graph Expansion Component Plan

## Objective
Implement System 2 (analytical/logical) retrieval via recursive CTE for 2-hop graph traversal.

## Schema Adaptation Required
- Use `canonical_name` instead of `name` in entities table
- Use `description` as `content` in entities table
- Use `is_active` boolean (added in previous migration)
- Use `weight` column from entity_relationships (already exists)

## Implementation Plan
1. Create `search_graph_expansion_v3` recursive CTE function
2. Create `graph_expansion_stats` monitoring view
3. Create verification SQL
4. Update TypeScript types if needed

## Key Features
- Cycle prevention with path arrays
- Per-hop limiting to control explosion
- Path weight decay (0.7 factor)
- Workspace isolation and security
- Final ranking by depth and weight