-- ============================================
-- COMMAND CENTER ERP V1.0 - INITIAL SCHEMA
-- ============================================
-- This migration creates the core tables with RLS
-- and the hybrid JSONB + Generated Columns pattern
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

-- ============================================
-- TABLE: workspaces
-- The tenancy root for multi-tenant isolation
-- ============================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- ============================================
-- TABLE: workspace_members
-- Junction table for workspace membership
-- ============================================

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Indexes for membership queries
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ============================================
-- TABLE: profiles
-- User profile data linked to auth.users
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    default_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS: Extraction helpers for Generated Columns
-- ============================================

-- Helper to extract widget types from BlockNote JSONB
CREATE OR REPLACE FUNCTION extract_widget_types(content jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT ARRAY(
        SELECT jsonb_array_elements_text(
            jsonb_path_query_array(content, 'strict $.**.type')
        )
    );
$$;

-- ============================================
-- TABLE: documents
-- The core document storage with JSONB content
-- and GENERATED COLUMNS for efficient querying
-- ============================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT 'Untitled',
    content JSONB NOT NULL DEFAULT '[]',
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- GENERATED COLUMN: Extract widget types from JSONB for indexing
    -- Replaces subquery with an IMMUTABLE function to comply with Postgres rules
    widget_index TEXT[] GENERATED ALWAYS AS (extract_widget_types(content)) STORED,
    
    -- GENERATED COLUMN: Full-text search vector
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content::text, ''))
    ) STORED,
    
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for workspace document listing
CREATE INDEX idx_documents_workspace ON documents(workspace_id);

-- GIN index on content for JSONB containment queries
CREATE INDEX idx_documents_content ON documents USING GIN (content jsonb_path_ops);

-- GIN index on widget_index for array containment queries
CREATE INDEX idx_documents_widgets ON documents USING GIN (widget_index);

-- GIN index for full-text search
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);

-- ============================================
-- TABLE: crm_leads (Demo Module)
-- Example transactional data table
-- ============================================

CREATE TABLE crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    status lead_status NOT NULL DEFAULT 'new',
    value NUMERIC(12, 2) DEFAULT 0,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for CRM queries
CREATE INDEX idx_crm_leads_workspace ON crm_leads(workspace_id);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_assigned ON crm_leads(assigned_to);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: workspaces
-- ============================================

-- Users can view workspaces they are members of
CREATE POLICY "Users can view their workspaces"
ON workspaces FOR SELECT
USING (
    id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
    OR owner_id = auth.uid()
);

-- Only owners can update their workspaces
CREATE POLICY "Owners can update their workspaces"
ON workspaces FOR UPDATE
USING (owner_id = auth.uid());

-- Authenticated users can create workspaces
CREATE POLICY "Authenticated users can create workspaces"
ON workspaces FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Only owners can delete workspaces
CREATE POLICY "Owners can delete their workspaces"
ON workspaces FOR DELETE
USING (owner_id = auth.uid());

-- ============================================
-- RLS: workspace_members
-- ============================================

-- Users can view members of their workspaces
CREATE POLICY "Users can view workspace members"
ON workspace_members FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Admins and owners can manage members
CREATE POLICY "Admins can manage workspace members"
ON workspace_members FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- ============================================
-- RLS: profiles
-- ============================================

-- Users can view all profiles (for @mentions, etc.)
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- RLS: documents
-- ============================================

-- Users can view documents in their workspaces
CREATE POLICY "Users can view documents in their workspaces"
ON documents FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can create documents in their workspaces
CREATE POLICY "Users can create documents in their workspaces"
ON documents FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
);

-- Users can update documents in their workspaces
CREATE POLICY "Users can update documents in their workspaces"
ON documents FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can delete documents they created
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE
USING (
    created_by = auth.uid()
    AND workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- ============================================
-- RLS: crm_leads
-- ============================================

-- Users can view leads in their workspaces
CREATE POLICY "Users can view leads in their workspaces"
ON crm_leads FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can create leads in their workspaces
CREATE POLICY "Users can create leads in their workspaces"
ON crm_leads FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can update leads in their workspaces
CREATE POLICY "Users can update leads in their workspaces"
ON crm_leads FOR UPDATE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Users can delete leads in their workspaces
CREATE POLICY "Users can delete leads in their workspaces"
ON crm_leads FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_crm_leads_updated_at
    BEFORE UPDATE ON crm_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TRIGGER: Auto-add owner as workspace member
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW EXECUTE FUNCTION handle_new_workspace();
