-- ============================================================================
-- Command Center V3.1 - Core Schema
-- Migration: 002_core_schema
-- Description: Create or update workspaces, documents, and blocks tables
-- ============================================================================

-- ============================================================================
-- WORKSPACES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT public.generate_uuidv7(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure V3.1 defaults and types for existing workspaces
ALTER TABLE public.workspaces 
    ALTER COLUMN id SET DEFAULT public.generate_uuidv7(),
    ALTER COLUMN settings SET DEFAULT '{}'::jsonb;

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);

-- Unique slug index (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug_lower ON public.workspaces(LOWER(slug));

-- ============================================================================
-- WORKSPACE_MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT public.generate_uuidv7(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);

-- Evolution for existing workspace_members
DO $$ 
BEGIN 
    -- Change role type to VARCHAR if it was an ENUM previously, or ensure check constraint
    -- (Assuming if it exists, we just ensure the default and constraint)
    ALTER TABLE public.workspace_members ALTER COLUMN id SET DEFAULT public.generate_uuidv7();
    
    -- Ensure role check constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_role_check') THEN
        ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check 
        CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
    END IF;
    
    -- Rename created_at to joined_at if needed, but safe to just ensure both exist or joined_at is present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'joined_at') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'created_at') THEN
            ALTER TABLE public.workspace_members RENAME COLUMN created_at TO joined_at;
        ELSE
            ALTER TABLE public.workspace_members ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Index for user's workspaces lookup
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT public.generate_uuidv7(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL DEFAULT 'Untitled',
    icon VARCHAR(50) DEFAULT NULL,
    cover_image_url TEXT DEFAULT NULL,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    path public.ltree NOT NULL DEFAULT 'root'
);

-- Evolution for existing documents (Add missing V3.1 columns)
DO $$ 
BEGIN 
    -- Set new PK default
    ALTER TABLE public.documents ALTER COLUMN id SET DEFAULT public.generate_uuidv7();

    -- Add parent_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'parent_id') THEN
        ALTER TABLE public.documents ADD COLUMN parent_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;
    END IF;

    -- Add icon
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'icon') THEN
        ALTER TABLE public.documents ADD COLUMN icon VARCHAR(50) DEFAULT NULL;
    END IF;

    -- Add cover_image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'cover_image_url') THEN
        ALTER TABLE public.documents ADD COLUMN cover_image_url TEXT DEFAULT NULL;
    END IF;

    -- Add is_template
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_template') THEN
        ALTER TABLE public.documents ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add archived_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'archived_at') THEN
        ALTER TABLE public.documents ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Add last_edited_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_edited_by') THEN
        ALTER TABLE public.documents ADD COLUMN last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add path (The core issue)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'path') THEN
        ALTER TABLE public.documents ADD COLUMN path public.ltree NOT NULL DEFAULT 'root';
    END IF;
    
    -- Update created_by to be nullable if it was NOT NULL (V3.1 allows SET NULL on delete)
    ALTER TABLE public.documents ALTER COLUMN created_by DROP NOT NULL;
    
    -- Remove content column if it exists (V3.1 moves content to blocks)
    -- WARNING: We keep it for now but note it's deprecated in V3.1
    -- IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'content') THEN
    --    ALTER TABLE public.documents RENAME COLUMN content TO legacy_content_json;
    -- END IF;
END $$;

-- CRITICAL: GIST index for ltree ancestor/descendant queries
CREATE INDEX IF NOT EXISTS idx_documents_path_gist ON public.documents USING GIST (path);

-- Index for workspace document listing
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);

-- Index for parent lookups (folder contents)
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON public.documents(parent_id);

-- Index for recently edited documents
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(workspace_id, updated_at DESC);

-- ============================================================================
-- BLOCKS TABLE
-- The atomic unit of content - heart of V3.1
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT public.generate_uuidv7(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    parent_path public.ltree NOT NULL DEFAULT 'root',
    type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order VARCHAR(100) NOT NULL COLLATE "C",
    embedding public.vector(1536) DEFAULT NULL,
    content_hash VARCHAR(64) DEFAULT NULL,
    embedding_updated_at TIMESTAMPTZ DEFAULT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRITICAL: B-Tree index on sort_order with C collation
CREATE INDEX IF NOT EXISTS idx_blocks_sort_order ON public.blocks(document_id, sort_order COLLATE "C");

-- GIST index for hierarchical queries within document
CREATE INDEX IF NOT EXISTS idx_blocks_parent_path_gist ON public.blocks USING GIST (parent_path);

-- Index for document block retrieval
CREATE INDEX IF NOT EXISTS idx_blocks_document_id ON public.blocks(document_id);

-- Index for type-based filtering
CREATE INDEX IF NOT EXISTS idx_blocks_type ON public.blocks(document_id, type);

-- IVFFLAT index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_blocks_embedding ON public.blocks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for incremental embedding updates
CREATE INDEX IF NOT EXISTS idx_blocks_embedding_stale 
    ON public.blocks(document_id, updated_at) 
    WHERE embedding_updated_at IS NULL OR embedding_updated_at < updated_at;

-- ============================================================================
-- KNOWLEDGE GRAPH EDGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT public.generate_uuidv7(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_entity VARCHAR(500) NOT NULL,
    source_entity_type VARCHAR(100) NOT NULL,
    relationship VARCHAR(200) NOT NULL,
    target_entity VARCHAR(500) NOT NULL,
    target_entity_type VARCHAR(100) NOT NULL,
    source_block_id UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ DEFAULT NULL,
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for entity lookups
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON public.knowledge_graph_edges(workspace_id, source_entity);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON public.knowledge_graph_edges(workspace_id, target_entity);

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_kg_edges_valid_time 
    ON public.knowledge_graph_edges(workspace_id, valid_from, valid_to);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (idempotent because of DROP IF EXISTS pattern usually, 
-- but we can just CREATE OR REPLACE the function and redefine triggers)
-- Note: PostgreSQL doesn't have CREATE TRIGGER IF NOT EXISTS before v14,
-- but we are on modern Supabase. To be safe:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspaces_updated_at') THEN
        CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
        CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blocks_updated_at') THEN
        CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_kg_edges_updated_at') THEN
        CREATE TRIGGER update_kg_edges_updated_at BEFORE UPDATE ON public.knowledge_graph_edges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
