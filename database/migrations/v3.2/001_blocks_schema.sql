-- V3.2 Phase 1: Atomic Blocks Schema
-- Dependencies: 004_uuidv7_function.sql, 005_fractional_indexing.sql, pgvector, ltree
-- Target: Create blocks_v3 table with dual-path hierarchy for Atomic Block Architecture

-- ============================================================================
-- 1. Create block_type ENUM
-- ============================================================================
DO $$ 
BEGIN
    -- Check if enum type already exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'block_type') THEN
        CREATE TYPE public.block_type AS ENUM (
            'page',
            'text', 
            'heading',
            'task',
            'code',
            'quote',
            'divider',
            'image',
            'table'
        );
        
        COMMENT ON TYPE public.block_type IS 'Types of atomic blocks in the V3.2 Atomic Block Architecture';
    END IF;
END $$;

-- ============================================================================
-- 2. Create blocks_v3 table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blocks_v3 (
    -- Primary Key: UUIDv7 for time-sortable, globally unique identifiers
    id UUID PRIMARY KEY DEFAULT public.generate_uuidv7(),
    
    -- Workspace Isolation: Multi-tenant security boundary
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- User Context: Who created/owns this block
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dual-Path Hierarchy Strategy
    -- Simple parent lookup for immediate children
    parent_id UUID REFERENCES public.blocks_v3(id) ON DELETE CASCADE,
    
    -- Efficient ancestor/descendant queries using ltree operators (@>, <@)
    path public.ltree NOT NULL,
    
    -- Block Type: ENUM for type-safe validation
    type public.block_type NOT NULL DEFAULT 'text',
    
    -- Fractional Indexing: Zero-latency reordering with COLLATE "C"
    sort_order TEXT NOT NULL COLLATE "C",
    
    -- Content Storage: TipTap JSON structure
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Embedding Column: OpenAI text-embedding-3-small (1536 dimensions)
    embedding public.vector(1536),
    
    -- Timestamps: Created and updated tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT blocks_v3_sort_order_unique UNIQUE (parent_id, sort_order),
    
    -- Ensure path consistency with parent_id (application-level enforcement)
    -- Note: Database triggers would handle this but omitted for simplicity in migration
    CONSTRAINT blocks_v3_path_not_empty CHECK (path::text != '')
);

-- ============================================================================
-- 3. Create all indexes
-- ============================================================================

-- Index for simple parent lookups
CREATE INDEX IF NOT EXISTS idx_blocks_v3_parent_id 
    ON public.blocks_v3(parent_id);

-- GIST index for efficient ltree ancestor/descendant queries
CREATE INDEX IF NOT EXISTS idx_blocks_v3_path_gist 
    ON public.blocks_v3 USING GIST (path);

-- Index for workspace isolation and user context
CREATE INDEX IF NOT EXISTS idx_blocks_v3_user_workspace 
    ON public.blocks_v3(user_id, workspace_id);

-- Composite index for fractional indexing lookups (with COLLATE "C")
CREATE INDEX IF NOT EXISTS idx_blocks_v3_sort_order 
    ON public.blocks_v3(parent_id, sort_order COLLATE "C");

-- HNSW index for vector similarity search (partial index excluding NULL embeddings)
-- Using pgvector's HNSW with optimized parameters for OpenAI text-embedding-3-small
CREATE INDEX IF NOT EXISTS idx_blocks_v3_embedding_hnsw 
    ON public.blocks_v3 USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

-- ============================================================================
-- 4. Create updated_at trigger
-- ============================================================================
-- Use existing update_updated_at_column function if it exists
-- Otherwise create it (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to blocks_v3 table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_blocks_v3_updated_at'
    ) THEN
        CREATE TRIGGER update_blocks_v3_updated_at 
            BEFORE UPDATE ON public.blocks_v3
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- 5. Add table comments
-- ============================================================================
COMMENT ON TABLE public.blocks_v3 IS 
'Atomic Block Architecture for Command Center V3.2. 
Every paragraph is a distinct, addressable entity with dual-path hierarchy (parent_id + ltree).
Supports zero-latency reordering via fractional indexing and future GraphRAG embedding storage.
Part of the Neural Workspace substrate for real-time knowledge graph construction.';

COMMENT ON COLUMN public.blocks_v3.id IS 
'UUIDv7 primary key - time-sortable, globally unique identifier generated by public.generate_uuidv7()';

COMMENT ON COLUMN public.blocks_v3.workspace_id IS 
'Workspace isolation - references workspaces table for multi-tenant security';

COMMENT ON COLUMN public.blocks_v3.user_id IS 
'User context - references auth.users for ownership and audit trail';

COMMENT ON COLUMN public.blocks_v3.parent_id IS 
'Simple parent reference for immediate child lookups - self-referential foreign key';

COMMENT ON COLUMN public.blocks_v3.path IS 
'ltree path for efficient ancestor/descendant queries using @> and <@ operators';

COMMENT ON COLUMN public.blocks_v3.type IS 
'Block type enum - page, text, heading, task, code, quote, divider, image, or table';

COMMENT ON COLUMN public.blocks_v3.sort_order IS 
'Fractional index key for zero-latency reordering - uses COLLATE "C" for lexicographic ordering';

COMMENT ON COLUMN public.blocks_v3.content IS 
'TipTap JSON structure - rich content storage with schema validation';

COMMENT ON COLUMN public.blocks_v3.embedding IS 
'OpenAI text-embedding-3-small vector (1536 dimensions) for semantic search and GraphRAG';

COMMENT ON COLUMN public.blocks_v3.created_at IS 
'Timestamp of block creation - automatically set on INSERT';

COMMENT ON COLUMN public.blocks_v3.updated_at IS 
'Timestamp of last update - automatically maintained by update_blocks_v3_updated_at trigger';

-- ============================================================================
-- 6. Verification query
-- ============================================================================
DO $$
DECLARE
    table_exists BOOLEAN;
    index_count INT;
    enum_exists BOOLEAN;
BEGIN
    -- Check if table was created
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blocks_v3'
    ) INTO table_exists;
    
    -- Check if enum type exists
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'block_type'
    ) INTO enum_exists;
    
    -- Count indexes on blocks_v3
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'blocks_v3' 
    AND schemaname = 'public';
    
    RAISE NOTICE 'V3.2 Blocks Schema Verification:';
    RAISE NOTICE '  - Table blocks_v3 exists: %', table_exists;
    RAISE NOTICE '  - Enum block_type exists: %', enum_exists;
    RAISE NOTICE '  - Index count on blocks_v3: %', index_count;
    RAISE NOTICE '  - Expected indexes: idx_blocks_v3_parent_id, idx_blocks_v3_path_gist,';
    RAISE NOTICE '    idx_blocks_v3_user_workspace, idx_blocks_v3_sort_order,';
    RAISE NOTICE '    idx_blocks_v3_embedding_hnsw (partial)';
    
    -- Verify HNSW index is partial
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'blocks_v3' 
        AND indexname = 'idx_blocks_v3_embedding_hnsw'
        AND indexdef LIKE '%WHERE embedding IS NOT NULL%'
    ) THEN
        RAISE NOTICE '  - HNSW index is correctly partial (excludes NULL embeddings): ✅';
    ELSE
        RAISE WARNING '  - HNSW index missing or not partial: ⚠️';
    END IF;
    
    -- Verify sort_order has COLLATE "C"
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blocks_v3' 
        AND column_name = 'sort_order'
        AND collation_name = 'C'
    ) THEN
        RAISE NOTICE '  - sort_order column has COLLATE "C": ✅';
    ELSE
        RAISE WARNING '  - sort_order column missing COLLATE "C": ⚠️';
    END IF;
    
END $$;

-- ============================================================================
-- Migration complete
-- ============================================================================