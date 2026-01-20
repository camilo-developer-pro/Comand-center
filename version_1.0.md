\# Version 1.0 Specification: Command Center ERP

\#\# 1\. System Architecture

\#\#\# 1.1 Directory Structure (Modified FSD)

\`\`\`text  
/src  
├── /app                \# Next.js App Router (Routing Shells)  
│   ├── /(auth)         \# Login/Register Routes  
│   ├── /(dashboard)    \# Protected Routes  
│   │   ├── /documents  \# Document Viewer  
│   │   └── /settings   \# Workspace Settings  
│   └── /api            \# Edge Functions / Webhooks  
├── /modules            \# FEATURE MODULES (Business Logic)  
│   ├── /core           \# Auth, Profiles, Workspace Context  
│   ├── /editor         \# BlockNote Logic, Registry  
│   │   ├── /components \# Editor.tsx, Toolbar.tsx  
│   │   ├── /schema     \# Zod Schemas for Blocks  
│   │   └── registry.ts \# The Dynamic Widget Registry  
│   └── /crm            \# Example Business Domain  
│       ├── /components \# LeadListWidget.tsx  
│       ├── /actions    \# Server Actions (mutateLeads)  
│       └── /types      \# Database Types  
├── /components         \# SHARED UI (shadcn/ui only)  
├── /lib                \# SINGLETONS (supabase-browser, utils)  
└── /types              \# GLOBAL TYPES (database.types.ts)

\#\# 2\. Database Schema (Supabase)

\#\#\# 2.1 Core Tables

\- \*\*workspaces\*\*: Tenancy root.  
\- \*\*documents\*\*:  
  \- \`id\`: UUID (PK)  
  \- \`content\`: JSONB (The BlockNote state)  
  \- \`title\`: TEXT  
  \- \`workspace\_id\`: UUID (FK)  
  \- \`search\_vector\`: TSVECTOR (Generated Column from content for FTS)  
  \- \`widget\_index\`: TEXT (Generated Column: extracts all \`block.type\` from content)

\#\#\# 2.2 Domain Tables (Example)

\- \*\*crm\_leads\*\*:  
  \- \`id\`: UUID  
  \- \`status\`: TEXT  
  \- \`value\`: NUMERIC  
  \- \`workspace\_id\`: UUID

\#\# 3\. The Widget Interface

\#\#\# 3.1 The Registry Contract

The registry must export a strongly-typed map. It acts as the implementation file, preventing circular dependencies.

\`\`\`typescript  
// src/modules/editor/registry.ts  
import dynamic from 'next/dynamic';

export const WIDGET\_REGISTRY \= {  
  'crm-leads': dynamic(() \=\> import('@/modules/crm/components/LeadListWidget'), {  
    loading: () \=\> \<Skeleton /\>,  
    ssr: false // Widgets strictly client-side  
  }),  
  // Future widgets added here  
};  
