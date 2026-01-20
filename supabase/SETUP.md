# Supabase Database Setup Guide

## Overview
This guide walks you through setting up the Supabase database for Command Center ERP V1.0.

## Prerequisites
- Node.js 18+ installed
- Supabase account (sign up at https://supabase.com)
- Project dependencies installed (`npm install`)

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Project Name**: Command Center ERP
   - **Database Password**: (choose a strong password)
   - **Region**: (select closest to your users)
4. Click "Create new project"
5. Wait for the project to initialize (~2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run the Migration

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/00001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify success: You should see "Success. No rows returned"

### Option B: Using Supabase CLI (Recommended for production)

1. Install Supabase CLI globally (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Link your local project to your Supabase project:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
   
   *Find your project ref in the Supabase dashboard URL: `https://app.supabase.com/project/[project-ref]`*

3. Push the migration:
   ```bash
   npx supabase db push
   ```

## Step 5: Verify the Schema

1. In Supabase Dashboard, go to **Table Editor**
2. You should see the following tables:
   - ✅ `workspaces`
   - ✅ `workspace_members`
   - ✅ `profiles`
   - ✅ `documents`
   - ✅ `crm_leads`

3. Click on `documents` table
4. Check the **Columns** tab - you should see:
   - `widget_index` (text[], generated column)
   - `search_vector` (tsvector, generated column)

## Step 6: Enable Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (enabled by default)
3. Optional: Enable additional providers (Google, GitHub, etc.)

## Database Architecture Highlights

### Hybrid Data Model
- **Documents** store JSONB layout configuration
- **Transactional data** lives in separate relational tables (e.g., `crm_leads`)
- **Generated columns** extract metadata from JSONB for efficient querying

### Security Features
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Multi-tenant isolation via `workspace_id`
- ✅ Dual-layer authorization (Document access + Data access)
- ✅ Automatic profile creation on user signup
- ✅ Automatic workspace membership for owners

### Performance Optimizations
- ✅ GIN indexes on JSONB content
- ✅ Generated columns for widget type indexing
- ✅ Full-text search vector for document search
- ✅ Optimized indexes for common queries

## Troubleshooting

### Error: "relation 'auth.users' does not exist"
**Solution**: This is normal - `auth.users` is a built-in Supabase table. The migration will work correctly.

### Error: "permission denied for schema auth"
**Solution**: Make sure you're running the migration as the project owner, not with the anon key.

### Migration fails midway
**Solution**: 
1. Go to **SQL Editor** in Supabase Dashboard
2. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Re-run the migration

## Next Steps

After completing the database setup:

1. **Generate TypeScript Types**:
   ```bash
   npx supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
   ```

2. **Create Supabase Client**: Set up the Supabase client in `src/lib/supabase/`

3. **Test Authentication**: Implement the auth module in `src/modules/core/`

4. **Build the Editor**: Integrate BlockNote in `src/modules/editor/`

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Generated Columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
