# Supabase Schema Quick Reference

## Database Tables

### Core Tables
- **workspaces** - Multi-tenant root (id, name, slug, owner_id, settings)
- **workspace_members** - User-workspace junction (workspace_id, user_id, role)
- **profiles** - User profiles (id, email, full_name, avatar_url, default_workspace_id)
- **documents** - Smart docs with JSONB content + generated columns
- **crm_leads** - Demo transactional data (name, email, company, status, value)

### Generated Columns (documents table)
- `widget_index` (TEXT[]) - Extracted widget types from JSONB
- `search_vector` (TSVECTOR) - Full-text search index

## ENUM Types
- `workspace_role`: 'owner' | 'admin' | 'member' | 'viewer'
- `lead_status`: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

## RLS Policies Summary

All tables have RLS enabled with workspace-scoped access control:
- Users can only access data in workspaces they're members of
- Owners have full control over their workspaces
- Dual-layer security: Document layout + Widget data

## Key Indexes

### Performance Indexes
- `idx_documents_content` - GIN index (jsonb_path_ops) for JSONB queries
- `idx_documents_widgets` - GIN index on widget_index array
- `idx_documents_search` - GIN index for full-text search

### Foreign Key Indexes
- `idx_workspaces_owner`
- `idx_workspace_members_workspace`
- `idx_workspace_members_user`
- `idx_documents_workspace`
- `idx_crm_leads_workspace`
- `idx_crm_leads_status`
- `idx_crm_leads_assigned`

## Automated Triggers

1. **Auto-create profile** - When user signs up
2. **Auto-add workspace member** - When workspace is created (owner)
3. **Auto-update timestamps** - On all tables with updated_at

## Common Queries

### Find documents with specific widget
```sql
SELECT * FROM documents 
WHERE widget_index @> ARRAY['crm-leads'];
```

### Full-text search
```sql
SELECT * FROM documents 
WHERE search_vector @@ to_tsquery('english', 'revenue & report');
```

### Get user's workspaces
```sql
SELECT w.* FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();
```

## Setup Commands

```bash
# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase

# Initialize Supabase
npx supabase init

# Link to remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migration
npx supabase db push

# Generate types
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## Files
- Migrations: 
  - `supabase/migrations/00001_initial_schema.sql` (Core)
  - `supabase/migrations/00002_performance_indexes.sql` (Performance)
  - `supabase/migrations/00003_benchmark_function.sql` (Benchmarks)
  - `supabase/migrations/00004_auth_triggers.sql` (Auth Triggers)
  - `supabase/migrations/00005_dev_seed_data.sql` (Dev Data)
- Setup Guide: `supabase/SETUP.md`
- Env Template: `.env.local.example`
