\# Project Definition: Modular Command Center ERP

\#\# 1\. Vision Statement  
To architect and build a scalable "Command Center" ERP that fuses the narrative flexibility of a document editor with the transactional power of a business dashboard. The system empowers users to compose their own workflows by embedding "live" business units (Widgets) directly into smart documents, replacing rigid, siloed ERP interfaces with a malleable, composable canvas.

\#\# 2\. Core Architectural Pillars

\#\#\# 2.1 Extreme Modularity (The "Browser" Concept)  
The core application acts as a host environment—a browser for business logic. Features such as CRM, Finance, and HR are built as isolated Modules. The core system provides the services (Auth, Navigation, Editor Shell), while the Modules provide the content (Widgets, Data Actions). This is implemented via a Feature-Sliced Modular Monolith architecture.

\#\#\# 2.2 The "Strong Skeleton" (V1.0 Priority)  
Version 1.0 is not a feature-complete ERP. It is the robust architectural skeleton required to support infinite future integrations. The priority is validating the end-to-end flow of:

\- \*\*Composition:\*\* Inserting a dynamic React component into a serialized JSON document.  
\- \*\*Persistence:\*\* Saving mixed-content (text \+ widget config) to PostgreSQL.  
\- \*\*Hydration:\*\* Loading and rendering the document with live data fetching.  
\- \*\*Security:\*\* Enforcing granular RLS across both document layouts and widget data.

\#\# 3\. Technology Stack  
\- \*\*Frontend Framework:\*\* Next.js 14 (App Router)  
\- \*\*Language:\*\* TypeScript (Strict Mode)  
\- \*\*Data & Auth:\*\* Supabase (PostgreSQL, GoTrue)  
\- \*\*Editor Engine:\*\* BlockNote (wrapping TipTap/ProseMirror)  
\- \*\*State Management:\*\* TanStack Query (React Query)  
\- \*\*Styling:\*\* Tailwind CSS \+ shadcn/ui (Radix Primitives)  
\- \*\*Package Manager:\*\* pnpm

\#\# 4\. User Personas  
\- \*\*The Architect (Admin/Manager):\*\* Responsible for designing workflows. They create the "Master Docs," configuring widgets and permissions. They require deep control over data sources and layout.  
\- \*\*The Operator (Contributor):\*\* The daily user. They open documents to update specific data points (e.g., "Move Lead to Qualified"). They require speed, clarity, and zero friction.

\#\# 5\. Risk Assessment & Constraints  
\- \*\*Performance Risk:\*\* A document with 50 live widgets could cause network congestion.  
  \- \*\*Mitigation:\*\* Implementation of "Lazy Hydration" via Intersection Observer and React Query. Widgets only fetch data when scrolled into view.  
\- \*\*Security Risk:\*\* Data leakage via document sharing.  
  \- \*\*Mitigation:\*\* Strict decoupling of Document RLS (Layout) and Widget RLS (Data).  
\- \*\*Complexity Risk:\*\* The "Block" logic of rich text editors is notoriously difficult.  
  \- \*\*Mitigation:\*\* Adoption of BlockNote to abstract the low-level ProseMirror complexity for V1.

\#\# 6\. Success Criteria (V1.0)  
\- \*\*Auth:\*\* Secure Multi-tenant Login (Email/Password \+ OAuth).  
\- \*\*Editor:\*\* Functional Rich Text Editor with slash commands.  
\- \*\*Registry:\*\* Capability to insert at least one "Custom Widget" via the registry.  
\- \*\*Persistence:\*\* Documents persist to DB and reload correctly.  
\- \*\*Security:\*\* User A cannot access User B's documents (verified via RLS tests).  
