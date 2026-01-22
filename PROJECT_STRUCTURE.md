# Project Structure: Command Center V3.0

> **Status:** Active Inference Engine Transition
> **Context:** V3.0 Architecture (Unified Memory, Active Inference, Neural Graph)
> **Map Protocol:** This file is the Source of Truth. Update it when adding/moving files.

## ASCII Directory Tree (3 Levels Deep)

```
comand-center/
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
│   │   ├── hooks/
│   │   ├── providers/
│   │   ├── supabase/
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
3. **Hybrid Search**: Vector embeddings + Full-text search + Graph traversal + RRF fusion
4. **Neural Graph**: Entity extraction → Edge creation → Force-directed visualization

---

## Context Breadcrumbs

> **Purpose**: Quick navigation trail for understanding project context and history.

### Project Evolution
```
V1.0 → V1.1 → V2.0 → V2.1 (Current)
```

### Active Development Phases
- [x] Phase 1: Foundation & Auth
- [x] Phase 2: CRM Integration
- [x] Phase 3: Editor & Widgets
- [x] Phase 4: Performance Optimization
- [x] Phase 5: Neural Graph
- [x] Phase 6: Hybrid Search
- [ ] Phase 7: AI Integration (Next)

### Key Entry Points
| Context | Path |
|---------|------|
| Main Planning Doc | `Command Center V2.1 ERP Implementation.md` |
| Project Log | `project_log.md` |
| Cursor Rules | `.cursorrules` |
| DB Schema | `supabase/migrations/00001_initial_schema.sql` |
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
1. Hybrid Search Migration fixes (`search_hybrid` function)
2. Fractional Indexing tests debugging
3. Dashboard KPI Cards frontend
4. Neural Graph feature integration
5. Vector Search RPC security

---

*Last Updated: 2026-01-22*

