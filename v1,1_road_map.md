# version 1.0 roadmap
The Strategic Roadmap (Weeks 1-8)  
This timeline is aggressive but realistic, focused on the "Strong Skeleton" methodology. We build the hardest parts (Architecture, Security, Persistence) first.

Phase 1: The Foundation & Infrastructure (Weeks 1-2)  
Goal: Establish the "Walking Skeleton"—Auth, Shell, and Editor State Persistence.

Week 1: Infrastructure & Auth

Repository Setup: Initialize Next.js 14 with strict ESLint (no barrel files) and Prettier.

Supabase Init: Configure local development environment with Supabase CLI.

Authentication: Implement Supabase Auth (Email/Password) and the auth module.

Layout Shell: Build the responsive sidebar and header using shadcn/ui components.

Data Model V1: Deploy workspaces, profiles, and documents tables with basic RLS.

Week 2: The Core Editor Engine

BlockNote Integration: Implement the Editor component using client-only dynamic imports.

Persistence Loop: Create the saveDocument Server Action. Implement useDebounce to auto-save document JSONB content.

Validation: Verify that complex nested block structures save and load correctly from PostgreSQL.

Phase 2: The Registry & Data Hybridization (Weeks 3-4)  
Goal: Prove the "Hybrid" model and Dynamic Loading capabilities.

Week 3: The Registry & Custom Blocks

Registry Implementation: Build registry.ts with next/dynamic.

Custom Block Pipeline: Create a "Hello World" custom block (e.g., an Alert Box) to validate the Zod schema definition and React rendering pipeline.

Generated Columns: Implement the SQL migration to add widget\_index (Generated Column) to the documents table.

Week 4: The CRM Module (Proof of Concept)

CRM Data Layer: Create crm\_leads table with separate RLS policies.

CRM Widget: Build LeadListWidget using TanStack Query.

Integration: Embed the CRM widget into the Editor. Verify that the document saves the configuration (e.g., status='new') while the widget fetches live data.

Phase 3: Advanced Security & Performance (Weeks 5-6)  
Goal: Harden the system against "Trojan Horse" attacks and optimize queries.

Week 5: Dual-Layer Security Implementation

RLS Hardening: Refine RLS policies to test "Partial Access" scenarios (User has doc access, but no CRM access).

Error Boundaries: Implement React Error Boundaries and TanStack Query error handling within widgets to gracefully display "Access Denied" states.

Server Action Security: Implement Zod validation middleware for all Server Actions.

Week 6: Indexing & Query Optimization

GIN Indexing: Apply jsonb\_path\_ops index to the documents.content column.

Query Performance: Benchmark "Find all docs with CRM widget" using the Generated Column vs. the raw JSONB column.

Search: Implement basic Full-Text Search using the tsvector generated column.

Phase 4: Polish, Testing & Handoff (Weeks 7-8)  
Goal: Finalize UX and prepare for developer handoff.

Week 7: Optimistic UI & Polish

Optimistic Updates: Implement optimistic UI for document title changes and widget insertion.

Loading States: Replace generic spinners with skeleton loaders for the Editor and Widgets to reduce Cumulative Layout Shift (CLS).

Week 8: Documentation & SOP Freeze

Developer Docs: Finalize the "How to create a new Widget" guide.

Code Freeze: Lock the core architecture.

Manager's Packet: Delivery of this final report and the SOP prompts.

The Execution SOP (The Handoff)  
This Standard Operating Procedure (SOP) consists of precise "Meta-Prompts" to be fed to the coding agent (Claude 4.5 Opus). These prompts use a "Role-Task-Constraint" framework to ensure adherence to the architectural decisions.

Phase 1 Prompt: The Skeleton & Hybrid Database  
Objective: Set up the repo, strict directory structure, and the Supabase schema with Generated Columns.

Prompt: "Act as a Principal Database Architect and Next.js Expert. We are initializing the 'Command Center' ERP V1.0.

Task 1: Folder Structure. Generate a bash script to create the specific directory structure defined in version\_1.0.md. Enforce the 'Modified Feature-Sliced Design' where src/app is for routing only and src/modules is for business logic. Create modules for core, editor, and crm. Remove any default components folder if it exists at the root.

Task 2: Database Schema (SQL). Write a comprehensive Supabase SQL migration file.

Create tables: workspaces, profiles, documents.

Enable RLS on ALL tables with a default 'deny all' policy.

CRITICAL: Define a GENERATED COLUMN on documents called widget\_index (text array) that extracts the type field from the JSONB content column using jsonb\_path\_query\_array.

Create a GIN index on the content column using jsonb\_path\_ops for efficient containment queries.

Task 3: Type Generation. Explain how to generate the TypeScript types (database.types.ts) from this schema and where to place them in the strict folder structure.

Constraint: Do not write React components yet. Focus strictly on the file system and the database layer. Use strictly typed SQL."

Phase 2 Prompt: The Editor & Registry Implementation  
Objective: Build the Editor component and the dynamic registry system.

Prompt: "Act as a Senior React Developer specializing in Performance and Bundle Optimization.

Context: We have the database setup. Now we need the frontend Editor Engine.

Task 1: The Editor Component. Create src/modules/editor/components/Editor.tsx.

It must use @blocknote/react.

It must be a Client Component ('use client').

Implement a useDebounce hook to auto-save the document JSON to Supabase using a Server Action.

Task 2: The Registry. Create src/modules/editor/registry.ts.

Use next/dynamic to lazy-load a placeholder widget.

Constraint: You must use ssr: false for the dynamic imports to prevent server-side hydration mismatches.

Define a TypeScript type WidgetKey that locks the allowed widget strings to match the database schema.

Task 3: Integration. Show how to mount the Editor component inside src/app/(dashboard)/documents/\[id\]/page.tsx.

Constraint: The page shell is a Server Component. It must fetch the initial document data and pass it as props to the Client Editor component."

Phase 3 Prompt: The Secure Data Widget  
Objective: Build the CRM widget and prove the dual-layer security model.

Prompt: "Act as a Full-Stack Security Engineer.

Task 1: The CRM Widget. Create src/modules/crm/components/LeadListWidget.tsx.

It should use tanstack-query to fetch leads from Supabase.

It must handle error states (specifically 403 Forbidden) to render an 'Access Denied' UI if the user lacks table permissions.

It must NOT import any server-side logic directly.

Task 2: The Server Action. Create src/modules/crm/actions/getLeads.ts.

Use 'use server'.

Validate the user's session and workspace membership explicitly at the top of the function.

Critical: Show how to enforce RLS context in the Supabase client creation within the action (using createClient with cookies).

Task 3: BlockNote Integration. Write the code to register this React component as a custom block in the BlockNote schema.

Define the Zod schema for the block attributes (e.g., filterStatus).

Ensure the widget does NOT store the lead data in the JSON attributes, only the configuration."

Phase 4 Prompt: Performance Optimization  
Objective: Implement "Generated Columns" query logic and indexing.

Prompt: "Act as a PostgreSQL Performance Specialist.

Context: We have documents containing widgets. We need to efficiently find all documents that contain a 'crm-widget'.

Task 1: The Query. Write a Supabase/Postgres query that utilizes the widget\_index Generated Column we created in Phase 1\.

Do NOT query the JSONB blob directly.

Query the text generated column using the array overlap operator (&&) or containment (@\>).

Task 2: The Index. Write the SQL to index this generated column for maximum read performance (B-Tree or GIN on the array).

Task 3: Explanation. Briefly explain to the junior devs why querying this generated column is faster than documents.content \-\>\> 'type' and how it bypasses the TOAST mechanism."

# V1.1 Phase Breakdown

Phase 1: Authentication & User Flow (Week 1-2)
Objective: Complete the authentication system so real users can sign up, log in, and access their workspaces.
TaskDescriptionPriority1.1Implement Supabase Auth UI (login/register forms)✅ Done1.2Create auth callback route for OAuth/Magic Link✅ Done1.3Implement logout functionality✅ Done1.4Build workspace creation flow (post-signup)✅ Done1.5Implement auth middleware for protected routes✅ Done1.6Add user profile dropdown in header✅ Done
Deliverables:

/app/(auth)/login/page.tsx - Full login form
/app/(auth)/register/page.tsx - Registration with workspace creation
/app/(auth)/callback/route.ts - OAuth callback handler
/src/modules/core/auth/ - Auth utilities and hooks


Phase 2: Live Widget Data (Week 2-3)
Objective: Transform stub widgets into fully functional components that fetch and mutate real data.
TaskDescriptionPriority2.1Implement CRM Lead List with TanStack Query🔴 Critical2.2Add lead status mutation (click to update)🔴 Critical2.3Implement error boundary for widget failures🔴 Critical2.4Add "Access Denied" state for RLS failures🔴 Critical2.5Create loading skeleton for widget data🟡 High2.6Add widget refresh button🟢 Medium
Deliverables:

Fully functional LeadListWidget with real data
useLeads hook with TanStack Query
updateLeadStatus Server Action
Widget error boundary component


Phase 3: Widget Insertion UX (Week 3-4)
Objective: Enable users to insert widgets via slash commands and a visual block menu.
TaskDescriptionPriority3.1Define custom BlockNote schema for widget blocks🔴 Critical3.2Create widget insertion slash command (/widget)🔴 Critical3.3Build widget picker modal/dropdown🔴 Critical3.4Implement widget configuration panel🟡 High3.5Add drag-and-drop reordering for widgets🟢 Medium3.6Create widget placeholder during loading🟡 High
Deliverables:

Custom BlockNote schema (widgetBlock)
Slash command handler for /leads, /chart, etc.
Widget picker UI component
Widget configuration sidebar


Phase 4: Lazy Hydration (Week 4-5)
Objective: Implement "lazy hydration" so widgets only fetch data when scrolled into view.
TaskDescriptionPriority4.1Create useIntersectionObserver hook🔴 Critical4.2Wrap widgets in lazy hydration boundary🔴 Critical4.3Implement placeholder skeleton until visible🔴 Critical4.4Add data prefetching on hover (optional)🟢 Medium4.5Benchmark 50-widget document load time🟡 High
Deliverables:

LazyHydrationBoundary component
useIntersectionObserver hook
Performance benchmark results
Optimized widget wrapper


Phase 5: Navigation & Dashboard (Week 5-6)
Objective: Build the complete navigation system and workspace dashboard.
TaskDescriptionPriority5.1Implement dynamic sidebar with document list✅ Done5.2Add document creation from sidebar✅ Done5.3Build workspace dashboard with widget stats✅ Done5.4Implement document search (full-text)✅ Done5.5Add recent documents section✅ Done5.6Create workspace settings page✅ Done
Deliverables:

Dynamic sidebar component
Dashboard page with analytics
Full-text search using search_vector
Settings page skeleton


Phase 6: Optimistic UI & Polish (Week 6-7)
Objective: Add optimistic updates and visual polish for production readiness.
TaskDescriptionPriority6.1Implement optimistic UI for document title🟡 High6.2Add optimistic UI for lead status changes🟡 High6.3Implement toast notifications (sonner)🟡 High6.4Add keyboard shortcuts (Cmd+S, Cmd+K)🟢 Medium6.5Implement dark mode toggle🟢 Medium6.6Add empty states for lists🟢 Medium
Deliverables:

Optimistic mutation patterns
Toast notification system
Keyboard shortcut handler
Dark mode implementation

Phase 7: Administration & Health Monitoring (V1.1 Bonus)
Objective: Professional-grade management and observability tools.
TaskDescriptionPriority7.1Super Admin Role & Whitelist✅ Done7.2Admin Dashboard (Stats/Audit Log)✅ Done7.3Workspace Impersonation✅ Done7.4API Performance Tracking✅ Done7.5Database Health Metrics✅ Done7.6Slow Request Detection✅ Done
Deliverables:

Admin Panel (/admin)
System Health Monitor (/admin/health)
Audit Logging System
API Performance Logs


V1.1 Success Criteria
CriteriaMetricTargetAuth FlowUser can sign up → create workspace → create document✅ CompleteWidget DataCRM widget displays real leads from database✅ CompleteWidget MutationClick lead status → database updated → UI reflects✅ CompleteWidget InsertionType /leads → widget inserted into document✅ CompleteLazy Hydration50-widget document loads in <2 seconds✅ <2sSearchFull-text search returns relevant documents✅ CompleteSecurityUnauthorized widget access shows "Access Denied"✅ Complete

Technical Architecture Additions
New Dependencies
json{
  "@supabase/auth-ui-react": "^0.4.0",
  "@supabase/auth-ui-shared": "^0.1.0",
  "sonner": "^1.0.0",
  "cmdk": "^0.2.0"
}
```

### New Directory Structure
```
/src
├── /modules
│   ├── /core
│   │   ├── /auth
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── UserMenu.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── actions/
│   │   │       └── authActions.ts
│   │   └── /workspace
│   │       ├── components/
│   │       │   ├── WorkspaceSwitcher.tsx
│   │       │   └── WorkspaceSettings.tsx
│   │       └── actions/
│   │           └── workspaceActions.ts
│   ├── /editor
│   │   ├── /blocks           # NEW: Custom BlockNote blocks
│   │   │   ├── WidgetBlock.tsx
│   │   │   └── widgetBlockSchema.ts
│   │   ├── /components
│   │   │   ├── SlashMenu.tsx      # NEW
│   │   │   ├── WidgetPicker.tsx   # NEW
│   │   │   └── LazyHydrationBoundary.tsx  # NEW
│   │   └── /hooks
│   │       └── useIntersectionObserver.ts  # NEW
│   └── /crm
│       ├── /components
│       │   └── LeadListWidget.tsx  # ENHANCED
│       ├── /hooks
│       │   └── useLeads.ts         # NEW
│       └── /actions
│           └── leadActions.ts      # ENHANCED
└── /components
    └── /layout
        ├── Sidebar.tsx         # ENHANCED
        ├── Header.tsx          # ENHANCED
        └── CommandMenu.tsx     # NEW (Cmd+K)
```

### Database Migrations (V1.1)
```
/supabase/migrations/
├── 00001_initial_schema.sql      # V1.0
├── 00002_performance_indexes.sql # V1.0
├── 00003_benchmark_function.sql  # V1.0
├── 00004_auth_triggers.sql       # V1.1 - Auth event handlers
├── 00005_workspace_defaults.sql  # V1.1 - Default workspace data
└── 00006_activity_log.sql        # V1.1 - User activity tracking