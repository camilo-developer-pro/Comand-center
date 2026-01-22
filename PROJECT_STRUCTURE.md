# Project Structure: Command Center V3.0

> **Status:** Milestone 2.1: Hybrid GraphRAG Complete ✅
> **Context:** V3.0 Architecture (Unified Memory, Active Inference, Neural Graph)
> **Map Protocol:** This file is the Source of Truth. Update it when adding/moving files.

## ASCII Directory Tree (3 Levels Deep)

```
comand-center/
├── api/
│   └── agent-runtime/
├── database/
│   └── migrations/
│       └── phase1/
│           ├── 001_extensions.sql
│           ├── 002_schemas.sql
│           ├── 003_roles.sql
│           ├── 004_uuidv7_function.sql
│           ├── 005_fractional_indexing.sql
│           ├── 006_episodic_memory_schema.sql
│           ├── 007_episodic_partman_setup.sql
│           ├── 008_semantic_memory_schema.sql
│           ├── 009_procedural_memory_schema.sql
│           ├── 010_entity_resolution_trigger.sql
│           ├── 011_dual_write_infrastructure.sql
│           ├── 012_logs_migration.sql
│           ├── 013_entity_backfill_resolution.sql
│           ├── 014_hybrid_graphrag_indexes.sql
│           ├── 015_vector_search_component.sql
│           ├── 016_graph_expansion_component.sql
│           ├── 017_search_hybrid_v3.sql
│           ├── verify_014_hybrid_graphrag.sql
│           ├── verify_015_vector_search.sql
│           ├── verify_016_graph_expansion.sql
│           ├── verify_017_search_hybrid_v3.sql
│           ├── verify_phase1_complete.sql
│           ├── DEPLOYMENT_RUNBOOK.md
│           └── rollback_phase1.sql
├── docs/
│   ├── PERFORMANCE_PATTERNS.md
│   ├── PERFORMANCE_REPORT.md
│   └── phase6-progress.md
├── public/
├── scripts/
│   ├── phase6-performance-test.ts
│   ├── verify-auth-setup.sh
│   ├── verify-pg-cron-setup.sh
│   ├── verify-phase1-v1.1.sh
│   ├── verify-phase2-v1.1.ps1
│   ├── verify-phase3-v1.1.js
│   ├── verify-phase3-v1.1.sh
│   ├── verify-phase4.sh
│   └── verify_phase_3.js
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── NeuralGraph/
│   │   ├── layout/
│   │   ├── providers/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   ├── __tests__/
│   │   ├── agent-runtime/
│   │   ├── hooks/
│   │   ├── protocols/
│   │   ├── providers/
│   │   ├── supabase/
│   │   │   ├── hybrid-search.ts
│   │   ├── types/
│   │   │   ├── hybrid-search.ts
│   │   ├── utils/
│   │   ├── fractional-indexing.ts
│   │   └── toast.ts
│   ├── modules/
│   │   ├── ai/
│   │   ├── core/
│   │   ├── crm/
│   │   ├── editor/
│   │   ├── finance/
│   │   └── graph/
│   ├── test/
│   ├── types/
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
│   └── items/
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
└── version_3.0.md
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

### Key Logic Flows

1. **Authentication Flow**: Supabase Auth → Middleware → Server Components
2. **Document CRUD**: Server Actions → Supabase RPC → RLS validation
3. **Hybrid Search**: Vector embeddings + Graph traversal + RRF fusion (`search_hybrid_v3`)
4. **Neural Graph**: Entity extraction → Edge creation → Force-directed visualization

---

## Context Breadcrumbs

> **Purpose**: Quick navigation trail for understanding project context and history.

### Project Evolution
```
V1.0 → V1.1 → V2.0 → V2.1 → V3.0 Phase 1 ✅ (Current)
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
- [ ] V3.0 Phase 2: Active Inference Engine (Next)

### Key Entry Points
| Context | Path |
|---------|------|
| Main Planning Doc | `Command Center V2.1 ERP Implementation.md` |
| V3.0 Technical Spec | `version_3.0.md` |
| V3.0 Development Blueprint | `Command Center V3.0 Development Blueprint.md` |
| V3.0 Phase 1 Runbook | `database/migrations/phase1/DEPLOYMENT_RUNBOOK.md` |
| Project Log | `project_log.md` |
| Cursor Rules | `.cursorrules` |
| DB Schema (V2.1) | `supabase/migrations/00001_initial_schema.sql` |
| V3.0 Memory Schemas | `database/migrations/phase1/` |
| App Entry | `src/app/layout.tsx` |

### High-Dependency Files (Critical Infrastructure)

> **Purpose**: Files with high coupling that affect many parts of the system. Modify with caution.

| File | Role | Dependents |
|------|------|------------|
| `middleware.ts` | Auth Middleware | All protected routes, session management |
| `src/lib/supabase/server.ts` | Server DB Client | All Server Actions, Server Components |
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

3. **`src/modules/core/auth/actions/authActions.ts`**
   - **What it does**: All auth mutations (signIn, signUp, signOut, password reset) + `getCurrentUser` with workspace resolution
   - **See Also**: `src/modules/core/auth/schemas/` (Zod validation), workspace "God-Mode" for Super Admins
   - **⚠️ Impact**: Auth bugs here affect all users; workspace resolution affects dashboard loading

### Recent Context (Last 5 Sessions)
1. V3.0 Milestone 2.1: Hybrid GraphRAG Complete ✅
2. System 1 (Vector Search) + System 2 (Graph Expansion) implemented
3. Reciprocal Rank Fusion (RRF) combining semantic and structural retrieval
4. `search_hybrid_v3` RPC with workspace isolation and performance monitoring
5. TypeScript client integration with embedding support

---

*Last Updated: 2026-01-22 (Milestone 2.1: Hybrid GraphRAG Complete ✅)*

