# Command Center V2.1: Technical Specification

## 1. System Overview
Version 2.1 introduces "Neuro-Symbolic" reasoning, combining the statistical power of LLMs with the deterministic structure of Knowledge Graphs.

## 2. New Modules

### 2.1 /modules/retrieval (Hybrid RAG)
- **Algorithm**: Reciprocal Rank Fusion (RRF).
- **Function**: `search_knowledge_base(query_embedding, query_text, workspace_id)`
- Parallel execution of HNSW search and recursive graph traversal.
- Normalization of scores (0-1).
- **Weighted summation**: Score = (Vector * 0.7) + (Graph * 0.3).
- **Entity Extraction**: Edge Function triggered on document update to populate `entity_edges`.

### 2.2 /modules/ordering (Fractional Indexing)
- **Library**: Custom implementation of `fractional-indexing`.
- **Logic**:
  - `generateKeyBetween(a, b)`: Returns a string lexicographically between `a` and `b`.
  - Base62 encoding to ensure compactness.
- **Constraint**: `rank_key` column must have a unique index per parent to prevent collisions (though mathematically rare). Collision handling via retry with jitter.

### 2.3 /modules/analytics (Async)
- **Architecture**:
  - `events` table: Log write operations.
  - `pg_cron`: Job `refresh_stats` runs every 5 minutes.
  - `mv_dashboard_stats`: Stores pre-computed KPIs.
- **Smart Trigger**: A trigger on `items` checks if `last_refresh > 5 min`. If so, it invokes a non-blocking request to Edge Function to trigger refresh (debounced).

## 3. Database Schema Changes

```sql
-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Optimized Items Table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    path ltree NOT NULL,
    rank_key TEXT NOT NULL COLLATE "C", -- Fractional Indexing
    content_vector vector(1536), -- Integrated embedding
    CONSTRAINT valid_path CHECK (path ~ '^[A-Za-z0-9_]+(.[A-Za-z0-9_]+)*$')
);

-- 2. Tuned Indexes
-- Tuned siglen for deep hierarchies
CREATE INDEX idx_items_path_gist ON items USING GIST (path gist_ltree_ops(siglen=256));
-- BTree for exact path lookup
CREATE INDEX idx_items_path_btree ON items USING BTREE (path);
-- HNSW for Vector Search
CREATE INDEX idx_items_vec_hnsw ON items USING hnsw (content_vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 3. Knowledge Graph Edges
CREATE TABLE entity_edges (
    source_id UUID REFERENCES items(id),
    target_id UUID REFERENCES items(id),
    type TEXT NOT NULL,
    weight FLOAT DEFAULT 1.0,
    PRIMARY KEY (source_id, target_id, type)
);

-- 4. Materialized View for Analytics
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT 
    workspace_id, 
    COUNT(*) as total_docs, 
    COUNT(*) FILTER (WHERE type='lead') as total_leads 
FROM items 
GROUP BY workspace_id;

CREATE UNIQUE INDEX idx_mv_stats_ws ON mv_dashboard_stats(workspace_id);

## 4. Performance Targets
- **Graph Rendering**: 60fps at 10,000 nodes via WebGL Instancing.
- **Search Latency**: <200ms for Hybrid Search (p95).
- **Reordering**: <50ms API response time (Optimistic).
- **Dashboard Load**: <100ms (Cached Materialized View).

## 5. V2.1 Roadmap
This roadmap assumes a high-velocity engineering team (3 Senior Engineers) working in 2-week sprints. It accounts for the technical risks identified in the deep research.

### Phase 1: The Foundation Refactor (Weeks 1-2)
**Objective**: Prepare the database schema for scale and switch ordering logic to prevent future write-locks.

- ### Week 1: Schema & Data Migration
- [x] Day 1-2: Add `rank_key` column and Base62 logic
- [x] Day 3: Data backfill from integer ranks
- [x] Day 4-5: Execute migration on staging. Verify O(1) performance for insertions in lists with >10k items.

### Week 2: Index Tuning
- [x] Implement GiST `siglen=256` optimization
- [x] Analyze and verify performance with `EXPLAIN`
- [x] Set up `pg_cron` and the `mv_dashboard_stats` materialized view.
- [x] Update `.cursorrules` and SOPs. Roll out the new core files to the development environment.

### Phase 2: The Hybrid Brain (Weeks 3-4)
**Objective**: Implement the GraphRAG pipeline and Hybrid Search RPC.

- **Week 3: Ingestion & Extraction**
  - **Day 1-3**: Build the Supabase Edge Function for entity extraction (using Vercel AI SDK).
  - **Day 4-5**: Implement the Database Trigger to call the extraction function on document save. Backfill entities for existing documents.
- **Week 4: Retrieval Logic**
  - **Day 1-3**: Write the `search_hybrid` PostgreSQL function. Implement the RRF algorithm in PL/pgSQL.
  - **Day 4**: Integrate `search_hybrid` into the "Ask AI" API endpoint.
  - **Day 5**: Evaluation. Compare V2.0 (Vector only) vs V2.1 (Hybrid) results on a benchmark set of multi-hop questions.

### Phase 3: The Infinite Canvas (Weeks 5-6)
**Objective**: Overhaul the Graph Visualization for 100k+ node support.

- **Week 5: WebGL & Workers**
  - **Day 1-2**: Scaffold the new `NeuralGraph` component using `react-force-graph-3d` (or 2d with WebGL renderer).
  - **Day 3-4**: Implement the Web Worker for offloading the d3-force simulation.
  - **Day 5**: Benchmark frame rates. Target 60fps at 10k nodes.
- **Week 6: UX Polish (LOD)**
  - **Day 1-3**: Implement Level of Detail shaders. Create the Quadtree-based text occlusion system.
  - **Day 4-5**: Implement "Focus Mode" (click to expand neighborhood) and dynamic data fetching.

### Phase 4: Zero-Lock Analytics & Production Launch (Week 7)
**Objective**: Finalize analytics and deploy.

- **Week 7**
  - **Day 1-2**: Connect the Dashboard UI to the `mv_dashboard_stats` view using SWR.
  - **Day 3**: Stress test the `pg_cron` concurrent refresh triggers. Ensure no locking occurs during bulk writes.
  - **Day 4**: Final regression testing.
  - **Day 5**: Production deployment.