# Project Structure: Command Center V3.1

> **Status:** V3.1: Atomic Block Ingestion Layer Complete ✅
> **Context:** V3.1 Architecture (Atomic Blocks, TipTap SSR, Kysely, Supabase SSR)
> **Map Protocol:** This file is the Source of Truth. Update it when adding/moving files.

## ASCII Directory Tree (3 Levels Deep)

```
comand-center/
├── api/
│   └── agent-runtime/
├── database/
│   └── migrations/
│       ├── phase1/
│       │   ├── 001_extensions.sql
│       │   ├── 002_schemas.sql
│       │   ├── 003_roles.sql
│       │   ├── 004_uuidv7_function.sql
│       │   ├── 005_fractional_indexing.sql
│       │   ├── 006_episodic_memory_schema.sql
│       │   ├── 007_episodic_partman_setup.sql
│       │   ├── 008_semantic_memory_schema.sql
│       │   ├── 009_procedural_memory_schema.sql
│       │   ├── 010_entity_resolution_trigger.sql
│       │   ├── 011_dual_write_infrastructure.sql
│       │   ├── 012_logs_migration.sql
│       │   ├── 013_entity_backfill_resolution.sql
│       │   ├── 014_hybrid_graphrag_indexes.sql
│       │   ├── 015_vector_search_component.sql
│       │   ├── 016_graph_expansion_component.sql
│       │   ├── 017_search_hybrid_v3.sql
│       │   ├── verify_014_hybrid_graphrag.sql
│       │   ├── verify_015_vector_search.sql
│       │   ├── verify_016_graph_expansion.sql
│       │   ├── verify_017_search_hybrid_v3.sql
│       │   ├── verify_extensions.sql
│       │   ├── verify_phase1_complete.sql
│       │   ├── DEPLOYMENT_RUNBOOK.md
│       │   └── rollback_phase1.sql
│       └── phase3/
│           ├── 001_error_taxonomy_schema.sql
│           ├── 002_diagnostic_engine.sql
│           ├── 003_seed_meta_agent_protocol.sql
│           ├── 004_protocol_patch_commit.sql
│           ├── 005_incremental_view_infrastructure.sql
│           ├── 006_realtime_notification_channels.sql
│           └── verify_phase3_complete.sql
├── docs/
│   ├── PERFORMANCE_PATTERNS.md
│   ├── PERFORMANCE_REPORT.md
│   └── phase6-progress.md
├── public/
├── scripts/
│   ├── check-phase3-status.js
│   ├── phase6-performance-test.ts
│   ├── verify-auth-setup.sh
│   ├── verify-pg-cron-setup.sh
│   ├── verify-phase1-v1.1.sh
│   ├── verify-phase2-v1.1.ps1
│   ├── verify-phase3-milestone-3.2.sh
│   ├── verify-phase3-v1.1.js
│   ├── verify-phase3-v1.1.sh
│   ├── verify-phase4.sh
│   └── verify_phase_3.js
├── src/
│   ├── __tests__/
│   │   ├── performance-benchmark.ts
│   │   └── phase4-integration.test.tsx
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   │   └── realtime/
│   │   │       └── bridge/
│   │   │           └── route.ts
│   │   ├── auth/
│   │   ├── command-center/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── NeuralGraph/
│   │   ├── layout/
│   │   ├── providers/
│   │   ├── reasoning/
│   │   │   ├── CycleMetrics.tsx
│   │   │   ├── LogEntry.tsx
│   │   │   ├── PhaseIndicator.tsx
│   │   │   └── ReasoningLog.tsx
│   │   └── ui/
│   ├── hooks/
│   │   └── useGraphWebSocket.ts
│   ├── lib/
│   │   ├── __tests__/
│   │   ├── agent-runtime/
│   │   ├── actions/
│   │   │   ├── types.ts
│   │   │   ├── workspace-actions.ts
│   │   │   ├── document-actions.ts
│   │   │   └── index.ts
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   ├── 001_extensions.sql
│   │   │   │   ├── 002_core_schema.sql
│   │   │   │   ├── 003_rls_policies.sql
│   │   │   │   ├── 004_auto_membership_trigger.sql
│   │   │   │   ├── verify_rls.sql
│   │   │   │   └── 004_verify_auto_membership.sql
│   │   │   ├── queries/
│   │   │   │   ├── blocks.ts
│   │   │   │   └── workspaces.ts
│   │   │   ├── codegen.ts
│   │   │   ├── generated-types.ts
│   │   │   ├── index.ts
│   │   │   ├── migrate.ts
│   │   │   ├── run-migration.ts
│   │   │   └── types.ts
│   │   ├── hooks/
│   │   │   └── useRealtimeSync.ts
│   │   ├── protocols/
│   │   ├── providers/
│   │   ├── realtime/
│   │   │   └── realtime-bridge.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── hybrid-search.ts
│   │   │   ├── middleware.ts
│   │   │   └── server.ts
│   │   ├── types/
│   │   │   ├── hybrid-search.ts
│   │   ├── utils/
│   │   │   ├── __tests__/
│   │   │   │   └── ltree.test.ts
│   │   │   ├── apiTracker.ts
│   │   │   ├── cn.ts
│   │   │   ├── formatRelativeTime.ts
│   │   │   ├── fractional-index.ts
│   │   │   ├── index.ts
│   │   │   ├── ltree.ts
│   │   │   ├── performanceLogger.ts
│   │   │   ├── toast.ts
│   │   │   └── uuid.ts
│   ├── modules/
│   │   ├── ai/
│   │   ├── core/
│   │   ├── crm/
│   │   ├── editor/
│   │   ├── finance/
│   │   └── graph/
│   ├── services/
│   ├── stores/
│   │   ├── graphStore.ts
│   │   └── reasoningLogStore.ts
│   ├── test/
│   ├── types/
│   │   ├── env.d.ts
│   │   └── database.types.ts
│   ├── utils/
│   ├── workers/
│   └── middleware.ts
├── supabase/
│   ├── functions/
│   ├── migrations/
│   ├── .temp/
│   ├── config.toml
│   ├── REFERENCE.md
│   └── SETUP.md
├── tests/
│   ├── items/
│   └── realtime-latency.spec.ts
├── .cursorrules
├── .env.local
├── .env.local.example
├── .gitignore
├── eslint.config.mjs
├── middleware.ts
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── project_definition.md
├── project_log.md
├── README.md
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.mjs
├── ERP V2.0 Planning & Architecture
└── version_3.1.md
```

---

## Dev4Dev Logic Summaries

> **Purpose**: High-level summaries of key logic patterns for developers onboarding to this codebase.

### @vibe-critical Tagged Files

> ⚠️ **Scan Result**: No files currently contain `// @vibe-critical` markers.
> 
> **Convention**: Add `// @vibe-critical` comments to files with complex, mission-critical logic that warrants extra documentation.

### Core Architecture Patterns

| Pattern | Location | Summary |
|---------|----------|---------|
| Feature-Sliced Design (FSD) | `src/modules/` | Domain-driven module organization (ai, core, crm, editor, finance, graph) |
| Server Actions | `src/modules/*/actions/` | Next.js Server Actions for secure data mutations |
| RLS Policies | `supabase/migrations/` | Row-Level Security enforced at database layer |
| Hierarchical Items | `00010_hierarchical_items_ltree.sql` | ltree-based document/folder hierarchy |
| Fractional Indexing | `src/lib/fractional-indexing.ts` | Lexicographic ordering for drag-drop reordering |
| Real-time Sync | `src/lib/hooks/useRealtimeSync.ts` | PostgreSQL LISTEN/NOTIFY → Supabase Broadcast → TanStack Query |
| Supabase SSR | `src/lib/supabase/` | Official @supabase/ssr patterns for Next.js App Router |

### Key Logic Flows

1. **Authentication Flow**: Supabase Auth → Middleware → Server Components
2. **Document CRUD**: Server Actions → Supabase RPC → RLS validation
3. **Hybrid Search**: Vector embeddings + Graph traversal + RRF fusion (`search_hybrid_v3`)
4. **Neural Graph**: Entity extraction → Edge creation → Force-directed visualization
5. **Real-time Sync**: DB Triggers → pg_notify → Bridge → Supabase Broadcast → React Hooks
6. **Active Inference**: Protocol execution → Scaffold hydration → LLM calls → State transitions
7. **WebGL Rendering**: Graph data → Web Worker physics → Instanced meshes → Single draw calls
8. **Atomic Ingestion**: TipTap Block parsing → Row-level PostgreSQL inserts → Async Embedding triggers

---

## Context Breadcrumbs

> **Purpose**: Quick navigation trail for understanding project context and history.

### Project Evolution
```
V1.0 → V1.1 → V2.0 → V2.1 → V3.0 → V3.1 Phase 2 ✅ (Current)
```

### Active Development Phases
- [x] Phase 1: Foundation & Auth
- [x] Phase 2: CRM Integration
- [x] Phase 3: Editor & Widgets
- [x] Phase 4: Performance Optimization
- [x] Phase 5: Neural Graph
- [x] Phase 6: Hybrid Search
- [x] V3.0 Phase 1: Substrate Hardening ✅
- [x] V3.0 Milestone 2.1: Hybrid GraphRAG Complete ✅
- [x] V3.0 Phase 3.1: Autonomous Self-Repair Complete ✅
- [x] V3.0 Phase 3.2: Asynchronous State Sync Complete ✅
- [x] V3.0 Phase 4: Infinite Interface Complete ✅
- [x] V3.1 Phase 1: Foundation & SSR Client Setup ✅
- [x] V3.1 Phase 2: Atomic Block Ingestion Layer ✅
- [x] V3.1 Phase 3: Multi-Tenant RLS Policies ✅
- [x] V3.1 Phase 4: Server Actions for Workspaces & Documents ✅
- [x] V3.1 Phase 5: TipTap Editor Core Implementation ✅
- [ ] V3.1 Phase 6: Real-time Synchronization & GraphRAG Integration (Next)

### Key Entry Points
| Context | Path |
|---------|------|
| Main Planning Doc | `Command Center V2.1 ERP Implementation.md` |
| V3.1 Execution Blueprint | `Command Center V3.1 Execution Blueprint.md` |
| V3.0 Technical Spec | `version_3.0.md` |
| V3.0 Development Blueprint | `Command Center V3.0 Development Blueprint.md` |
| Project Log | `project_log.md` |
| Cursor Rules | `.cursorrules` |
| DB Schema (V3.1 Core) | `src/lib/db/migrations/002_core_schema.sql` |
| Kysely Types | `src/lib/db/generated-types.ts` |
| App Entry | `src/app/layout.tsx` |

### High-Dependency Files (Critical Infrastructure)

> **Purpose**: Files with high coupling that affect many parts of the system. Modify with caution.

| File | Role | Dependents |
|------|------|------------|
| `middleware.ts` | Auth Middleware | All protected routes, session management |
| `src/lib/supabase/server.ts` | Server DB Client | All Server Actions, Server Components |
| `src/lib/db/index.ts` | Kysely DB Client | All type-safe SQL operations |
| `src/lib/utils/index.ts` | Core Utilities | Identifier generation, ltree paths, sorting |
| `src/modules/core/auth/actions/authActions.ts` | Auth Actions | Login, Signup, Session, Workspace resolution |

#### See Also Notes

1. **`middleware.ts`** (Root)
   - **What it does**: Edge-runtime auth guard; validates sessions, redirects unauthenticated users
   - **See Also**: `src/lib/supabase/middleware.ts` (cookie sync), `PROTECTED_ROUTES` config
   - **⚠️ Impact**: Breaking this breaks ALL protected pages

2. **`src/lib/supabase/server.ts`**
   - **What it does**: Creates typed Supabase client for Server Components with cookie-based auth
   - **See Also**: `src/lib/supabase/client.ts` (browser client), `Database` types
   - **⚠️ Impact**: Every Server Action depends on this; changes affect data layer globally

3. **`src/lib/utils/index.ts`**
   - **What it does**: Centralized access to critical infrastructure (UUIDv7, Ltree, Fractional Indexing)
   - **See Also**: `src/lib/utils/uuid.ts`, `src/lib/utils/ltree.ts`
   - **⚠️ Impact**: Identifier and path logic bugs cache-poison the database across all modules

### Recent Context (Last 5 Sessions)
1. V3.1 Phase 5: TipTap Editor Core Implementation with Atomic Folder Operations ✅
2. V3.1 Phase 4: Server Actions for Workspace & Document CRUD ✅
3. V3.1 Phase 3: Identity & Access Automation (RLS + Auto-membership Triggers) ✅
4. V3.1 Phase 2: Atomic Block Ingestion Layer & Type-Safe SQL ✅
5. Unified `ActionResult` pattern for robust application-layer error handling

---

*Last Updated: 2026-01-24 (V3.1 Phase 5 Complete ✅)*
