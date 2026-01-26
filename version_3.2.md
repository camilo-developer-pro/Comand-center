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

### Phase 1: The Recursive Foundation ✅
**Goal:** Setup Supabase and the recursive `blocks` table.
- **Status:** **COMPLETE** - All 7 verification tests passed
- **Accomplishments:**
  - ✅ Created `blocks_v3` table with UUIDv7, ltree path hierarchy, fractional indexing, and OpenAI embedding support
  - ✅ Implemented automatic path synchronization with `blocks_path_trigger_fn()` trigger
  - ✅ Deployed multi-tenant RLS policies with `is_workspace_member()` security
  - ✅ Created comprehensive TypeScript Zod schemas for block validation
  - ✅ Implemented Kysely type-safe query functions for block operations
  - ✅ Verified Phase 1 deployment with 7-test verification suite
  - ✅ Fixed HNSW index pattern matching issue (parentheses in WHERE clause)
- **Verification:** All 7 tests passed:
  1. blocks_v3 table exists
  2. block_type ENUM with correct values
  3. HNSW embedding index exists (partial)
  4. Path GIST index exists
  5. RLS enabled on blocks_v3
  6. fi_generate_key_between() exists
  7. blocks_path_sync trigger attached

### Phase 2: The Atomic Editor & Layout ✅
**Goal:** Build the "Functional Frontend" where you can actually write.
- **Status:** **COMPLETE** - Full Document Editor with Sidebar and Focus Management
- **Accomplishments:**
  - ✅ Created `BlockRenderer.tsx` component that maps over children blocks of a page with proper TypeScript typing
  - ✅ Implemented `FocusManager` context and hook for atomic block focus management with keyboard navigation support
  - ✅ Built complete Document Editor page with workspace-based routing: `/workspace/[slug]/doc/[documentId]`
  - ✅ Created Shadcn-based Workspace Layout with Infinite Sidebar (DocumentTree), Breadcrumbs, and main Content Area
  - ✅ Implemented DocumentTree sidebar component with hierarchical document navigation using `ltree` paths
  - ✅ Added optimistic title updates in DocumentHeader with immediate UI feedback
  - ✅ Integrated TipTap editor with FocusManager for subtle highlighting of active blocks
  - ✅ Implemented Next.js 15 async params pattern for workspace-based document routing
  - ✅ Added comprehensive error handling with 404 pages for missing workspaces or documents
  - ✅ Ensured TypeScript type safety across all components with strict interfaces
- **Key Components Created:**
  1. `src/app/workspace/[slug]/doc/[documentId]/page.tsx` - Workspace-based document editor page
  2. `src/modules/editor/components/FocusManager.tsx` - Context-based focus management
  3. `src/modules/editor/components/BlockRenderer.tsx` - Atomic block rendering
  4. `src/modules/editor/components/DocumentTree.tsx` - Hierarchical sidebar navigation
  5. `src/modules/editor/components/DocumentHeader.tsx` - Enhanced with optimistic title updates
  6. `src/modules/editor/components/DocumentEditor.tsx` - Updated with FocusManager integration

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