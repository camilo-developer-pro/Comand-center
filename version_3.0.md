This file is the technical specification that describes the schemas and logic flows.

# Command Center V3.0: Technical Specification

## 1. System Overview
V3.0 evolves Command Center into an **Autonomous Reasoning Engine**. It utilizes **Active Inference** to perceive, predict, and act upon enterprise data.

## 2. Core Modules

### 2.1 /modules/memory (Unified Memory System)
**Schema:**
- **episodic_memory:**
  - `events` (Partitioned): Immutable log of all system actions.
  - `conversations`: Chat history with the agent.
- **semantic_memory:**
  - `entities`: The nodes of the knowledge graph.
  - `relationships`: The edges (with weights).
  - `embeddings`: The vector store.
- **procedural_memory:**
  - `protocols`: JSON definitions of agent behavior.
  - `tools`: Registered SQL/API functions.

**Integration:**
- Background "Consolidation" jobs (`pg_cron`) move data from Episodic -> Semantic.
- "Forget" mechanism: Time-based partitioning drops raw logs after 90 days, keeping only synthesized Facts.

### 2.2 /modules/autonomy (Active Inference)
**Agent Runtime:** Vercel Edge Function or Long-running Python Worker.

**Loop:**
1. **Observe:** Query `episodic_memory` for new triggers (e.g., INSERT on documents).
2. **Orient:** Load relevant Protocol from `procedural_memory`.
3. **Decide:** LLM (Claude 4.5) generates Plan based on Protocol.
4. **Act:** Execute Tool (SQL/API).
5. **Learn:** If error, invoke `ErrorProtocol` to update the base Protocol.

### 2.3 /modules/graph (The Neural Graph)
- **Visualization:** WebGL-based (`react-force-graph-3d`).
- **Data Source:** Real-time WebSocket feed from `pg_notify` on `semantic_memory` changes.
- **Interactions:**
  - Right-click entity -> "Expand Neighborhood" (Fetch 2-hop via Recursive CTE).
  - Drag-drop -> Updates `rank_key` via Optimistic UI + RPC.

## 3. Database Schema Changes (Postgres 16+)

```sql
-- Enable V3.0 Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_ivm; -- Incremental View Maintenance

-- 1. Optimized Entity Table (Semantic Memory)
CREATE TABLE semantic_memory.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    path ltree NOT NULL, -- Hierarchy
    rank_key TEXT COLLATE "C" NOT NULL, -- Fractional Index
    embedding vector(1536),
    properties JSONB DEFAULT '{}',
    CONSTRAINT unique_rank_per_parent UNIQUE (parent_id, rank_key) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Protocol Storage (Procedural Memory)
CREATE TABLE procedural_memory.protocols (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    version INT DEFAULT 1,
    definition JSONB NOT NULL, -- The "DNA" of the agent
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Incremental Analytics
-- Updates purely on delta changes, no full refresh required
CREATE INCREMENTAL MATERIALIZED VIEW analytics.dashboard_stats AS
SELECT 
    workspace_id, 
    count(*) as total_entities, 
    avg((properties->>'revenue')::numeric) as avg_revenue 
FROM semantic_memory.entities 
GROUP BY workspace_id;
```
