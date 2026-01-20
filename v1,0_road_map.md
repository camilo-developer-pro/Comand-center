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