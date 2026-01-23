# PROJECT_BRIEF: Command Center V3.1 - Atomic Ingestion Layer

## 1. Vision & North Star
Transform the Command Center V3.0 substrate into a functional "Neural Workspace." The goal is to allow the user to ingest, link, and visualize personal knowledge in real-time. The "Magic Moment" is an editor that feels local (zero-latency) but syncs every block to a unified memory graph via PostgreSQL.

## 2. Tech Stack (Strict Vibe Stack)
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (Postgres 16+)
- **Extensions:** `ltree` (Hierarchy), `pgvector` (Semantic), `pg_partman` (Episodic partitioning).
- **ORM:** Kysely (Strict Type Safety - NO Prisma).
- **Editor Core:** TipTap (Block-based abstraction).
- **State & Sync:** TanStack Query v5 (Optimistic UI), `pg_notify` -> Real-time Bridge.
- **Styling:** Tailwind CSS + shadcn/ui.

## 3. Database Schema (V3.1 Additions)
Existing schemas (`memory.episodic`, `memory.semantic`) are maintained. We add structural hierarchy for documents:

```sql
-- Migration 018: Document Hierarchy
CREATE TABLE memory.documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id uuid NOT NULL,
  title text NOT NULL,
  path ltree NOT NULL, -- For folder structure
  rank_key text NOT NULL, -- Base62 Fractional Indexing
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, rank_key)
);

CREATE TABLE memory.blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  document_id uuid REFERENCES memory.documents(id) ON DELETE CASCADE,
  content jsonb NOT NULL, -- TipTap JSON format
  rank_key text NOT NULL, -- Order within document
  type text NOT NULL,     -- paragraph, heading, link, entity
  semantic_id uuid,       -- Link to semantic_memory.entities
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(document_id, rank_key)
);

-- Trigger for Real-time Graph Update
CREATE OR REPLACE FUNCTION memory.fn_notify_block_change() 
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('block_updated', json_build_object(
    'id', NEW.id,
    'document_id', NEW.document_id,
    'content', NEW.content
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
4. Implementation Plan (4 Phases)
Phase 1: The Relational Backbone (Sprints 1-3)
Prompt for Agent: > "Implement the memory.documents and memory.blocks tables using the provided SQL. Create a Kysely schema that matches this. Implement the fi_generate_key_between Base62 function for fractional indexing as defined in the V3.0 pillars. Ensure ltree paths update atomically when a document is moved."

Phase 2: Zero-Latency Block Editor (Sprints 4-7)
Prompt for Agent:

"Build a TipTap-based block editor in src/modules/editor. Implement a debounced 'Auto-Save' Server Action using Kysely. Use TanStack Query's onMutate for Optimistic UI updates. As the user types, every block change must sync to the blocks table. Ensure the rank_key logic prevents collisions during rapid block reordering."

Phase 3: The Multi-Modal Dropper (Sprints 8-11)
Prompt for Agent:

"Create a global 'Drop Zone' component using react-dropzone. Files dropped here must upload to Supabase Storage. Trigger an Edge Function to: 1. Extract text (PDF/Image/URL). 2. Call the existing search_hybrid_v3 to find related graph nodes. 3. Automatically create a new 'Document' with linked semantic entities."

Phase 4: God-Mode Command Palette (Sprints 12-14)
Prompt for Agent:

"Implement a Cmd+K interface using cmdk. It must interrogate the search_hybrid_v3 RPC. Allow users to search by vector similarity (vibe) and structural relationships (graph). Selecting a result must use the Bi-Directional Portal logic: scroll the editor to the block or focus the 3D graph on the node."