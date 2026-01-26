# Project: The Atomic Brain (Vibe-Native Workspace)
## Vision
A high-performance, personal Knowledge Operating System. It uses an **Atomic Block Architecture** where every paragraph is a distinct, addressable entity. It features **GraphRAG-based Semantic Auto-Linking**, zero-latency **Fractional Indexing** reordering, and a completely **Save-less Sync** experience.

## Tech Stack (The Vibe Stack)
- **Framework:** Next.js 15 (App Router, Server Actions, Async Request APIs)
- **Database/Auth:** Supabase (pgvector for embeddings, Realtime for sync)
- **UI/Styling:** Tailwind CSS + Shadcn/UI (Refined, Pro-Tool aesthetic)
- **Editor Engine:** TipTap (Customized for Atomic Block rendering)
- **State/Data:** TanStack Query (Optimistic Updates) + Zod (Strict Validation)

## .cursorrules (Context Engineering)
- **Strict Typing:** Never use `any`. Every block mutation must follow the Zod Schema.
- **Async Sovereignty:** Always use Next.js 15 async APIs (`headers()`, `params`, etc.).
- **Optimistic First:** All mutations must update the UI state before the Supabase server response is confirmed.
- **Component Pruning:** Keep components atomic. If a component exceeds 150 lines, extract a sub-component.
- **Context Rot Prevention:** Reference this `PROJECT_BRIEF.md` every time a new feature is initiated.

## Phase-by-Phase Implementation Plan

### Phase 1: The Recursive Foundation
**Goal:** Setup Supabase and the recursive `blocks` table.
- **Task:** Create a `blocks` table with: `id` (UUID), `parent_id` (UUID, nullable, self-ref), `type` (text), `content` (jsonb), `index` (text/LexoRank), `user_id` (uuid).
- **Task:** Implement Supabase Auth with `@supabase/ssr`.
- **Task:** Create a basic layout with a sidebar that fetches the top-level "Page" blocks.

### Phase 2: The Atomic Editor & Layout
**Goal:** Build the "Functional Frontend" where you can actually write.
- **Task:** Build a `BlockRenderer.tsx` that maps over children blocks of a page.
- **Task:** Implement TipTap for text/task blocks. Pressing "Enter" at the end of a block must create a new sibling block with a higher LexoRank index.
- **Task:** Build the Shadcn-based Workspace Layout: Infinite Sidebar, Breadcrumbs, and the main Content Area.
- **Task:** Style the "Focus" state—the active block should be subtly highlighted.

### Phase 3: Zero-Latency Sync & Reordering
**Goal:** Eliminate the "Save" button and allow drag-and-drop.
- **Task:** Implement TanStack Query mutations for `onBlur` or `onChange` (debounced) to sync block content.
- **Task:** Integrate `dnd-kit` or `hello-pangea/dnd` for block reordering.
- **Task:** Use Fractional Indexing logic (LexoRank) to update the `index` column on drop.

### Phase 4: Semantic Intelligence (GraphRAG)
**Goal:** The "Brain" layer and Semantic Search-to-Create.
- **Task:** Setup a Supabase Edge Function to generate OpenAI embeddings on block `insert` or `update`.
- **Task:** Build the "Semantic Sidebar" that performs a `pgvector` similarity search based on the current active block's embedding.
- **Task:** Implement "Search-to-Create": A global search bar that creates a new page if no similar content (>0.85) is found.

## Database Schema (SQL Snippet)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'text', -- 'page', 'text', 'task', 'table'
  content JSONB,
  index TEXT NOT NULL, -- LexoRank
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON blocks USING ivfflat (embedding vector_cosine_ops);