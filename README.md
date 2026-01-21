# Command Center ERP - V1.0

A modular "Command Center" ERP that fuses the narrative flexibility of a document editor with the transactional power of a business dashboard.

## 🎯 Project Vision

Command Center ERP is a **"Browser for Business Logic"** - a composable canvas where users can embed live business widgets (CRM, Finance, HR) directly into smart documents, replacing rigid, siloed ERP interfaces with a malleable, Notion-like experience.

## 🏗️ Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript (Strict Mode)
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Editor:** BlockNote (TipTap/ProseMirror)
- **State:** TanStack Query (React Query)
- **Styling:** Tailwind CSS + shadcn/ui
- **Package Manager:** npm

### Directory Structure (Feature-Sliced Design)
```
/src
├── /app                # Next.js App Router (Routing Shells)
│   ├── /(auth)         # Login/Register Routes
│   ├── /(dashboard)    # Protected Routes
│   └── /api            # Edge Functions / Webhooks
├── /modules            # FEATURE MODULES (Business Logic)
│   ├── /core           # Auth, Profiles, Workspace Context
│   ├── /editor         # BlockNote Logic, Registry
│   └── /crm            # Example Business Domain
├── /components         # SHARED UI (shadcn/ui only)
├── /lib                # SINGLETONS (utils, supabase)
└── /types              # GLOBAL TYPES (database.types.ts)
```

## 🗄️ Database Schema

### Hybrid Data Model
- **Documents** store JSONB content (layout configuration)
- **Transactional data** lives in separate relational tables
- **Generated columns** extract metadata from JSONB for efficient querying
- **RLS** enforces multi-tenant security at the database level

### Core Tables
- `workspaces` - Multi-tenant root
- `workspace_members` - User-workspace junction with roles
- `profiles` - User profile data
- `documents` - Smart docs with JSONB + generated columns
- `crm_leads` - Demo transactional data table

### Key Features
✅ **Lazy Hydration** - Widgets only load when scrolled into view
✅ **Generated Columns** for widget indexing and full-text search  
✅ **GIN Indexes** on JSONB for high-performance queries  
✅ **Row Level Security** on all tables  
✅ **Automated Triggers** for profile creation and timestamps  
✅ **Dual-Layer Security** (Document access + Widget data access)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/camilo-developer-pro/Comand-center.git
   cd comand-center
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a Supabase project at https://supabase.com
   - Follow the detailed setup guide: [`supabase/SETUP.md`](./supabase/SETUP.md)
   - Run the migration: `supabase/migrations/00001_initial_schema.sql`

4. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

5. **Generate TypeScript types**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.types.ts
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[Setup Guide](./supabase/SETUP.md)** - Complete Supabase setup instructions
- **[Quick Reference](./supabase/REFERENCE.md)** - Database schema and common queries
- **[Architecture](./Modular%20ERP%20Command%20Center%20Architecture.md)** - Detailed architectural blueprint
- **[V1.0 Specification](./version_1.0.md)** - Technical implementation spec
- **[Project Definition](./project_definition.md)** - Vision and core pillars
- **[Cursor Rules](./cursorrules.md)** - AI coding assistant guidelines

## 🎯 V1.1 Success Criteria

1. ✅ **Auth:** Secure multi-tenant login (Email/Password + OAuth)
2. ✅ **Navigation:** Dynamic sidebar and workspace dashboard
3. ✅ **Search:** Global full-text search (Cmd+K)
4. ✅ **Widgets:** CRM Lead List with optimistic updates and lazy hydration
5. ✅ **Admin:** Super Admin panel with impersonation and audit logs
6. ✅ **Observability:** Real-time system health and performance monitoring

## 🔐 Security Model

### Dual-Layer Authorization
1. **Document Access (Container):** RLS on `documents` table controls who can view the layout
2. **Widget Data Access (Content):** RLS on domain tables (e.g., `crm_leads`) controls who can view the data

**Result:** Users can see document layouts but get "Access Denied" for restricted widget data.

## ⚡ Performance Optimizations

- **Generated Columns:** Extract metadata from JSONB at write-time for fast indexed queries
- **GIN Indexes:** `jsonb_path_ops` for 30-50% smaller, faster indexes
- **Dynamic Imports:** Lazy-load widgets with `next/dynamic` to reduce bundle size
- **Client-Side Caching:** TanStack Query for optimistic updates and real-time data

## 🛠️ Development

### Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Coding Standards
- **TypeScript:** Strict mode, no `any` types
- **Imports:** Explicit imports (no barrel files)
- **Client/Server:** Clear separation with `'use client'` directive
- **RLS First:** Security enforced at database level

## 📖 Project Status

**Current Phase:** V1.1 Navigation, Search & Administration ✅  
**Next Phase:** Mobile Optimization & Collaboration (V1.2)

See [`project_log.md`](./project_log.md) for detailed progress updates.

## 📝 License

Private - All Rights Reserved

## 👥 Team

- **Architect:** Senior PostgreSQL Database Architect
- **Developer:** Full-Stack TypeScript Engineer
- **Project:** Command Center ERP V1.0
