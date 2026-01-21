-- Migration: Index Optimization for V2.1
-- Version: V2.1
-- Description: Tuned indexes for deep hierarchies and fractional ordering

-- ============================================
-- DROP OLD INDEXES (Clean state)
-- ============================================

DROP INDEX IF EXISTS public.idx_items_path;
DROP INDEX IF EXISTS public.idx_items_path_gist;
DROP INDEX IF EXISTS public.idx_items_path_btree;
DROP INDEX IF EXISTS public.idx_items_sibling_order;
DROP INDEX IF EXISTS public.idx_items_workspace_type;

-- ============================================
-- OPTIMIZED LTREE INDEXES
-- ============================================

-- 1. GiST Index for Hierarchy Traversal (<@, @>)
-- siglen=256 reduces lossiness for paths up to ~50 levels deep
CREATE INDEX idx_items_path_gist 
ON public.items USING GIST (path gist_ltree_ops(siglen=256));

COMMENT ON INDEX idx_items_path_gist IS 
'V2.1 optimized GiST index with siglen=256 for deep hierarchy queries';

-- 2. B-Tree Index for Exact Path Lookup (=, <, >)
CREATE INDEX idx_items_path_btree 
ON public.items USING BTREE (path);

COMMENT ON INDEX idx_items_path_btree IS 
'B-Tree index for exact path matches and breadcrumb queries';

-- ============================================
-- FRACTIONAL INDEX ORDERING
-- ============================================

-- 3. Composite index for sibling queries
-- Covers: WHERE parent_id = X ORDER BY rank_key
CREATE INDEX idx_items_sibling_order 
ON public.items (parent_id, rank_key COLLATE "C");

COMMENT ON INDEX idx_items_sibling_order IS 
'Optimized for fetching ordered children of a folder';

-- ============================================
-- WORKSPACE PARTITIONING INDEX
-- ============================================

-- 4. Workspace filtering (multi-tenant queries)
-- Adjusted schema alignment: using item_type instead of type
CREATE INDEX idx_items_workspace_type
ON public.items (workspace_id, item_type);

COMMENT ON INDEX idx_items_workspace_type IS 
'Supports workspace-scoped queries with type filtering';

-- ============================================
-- VECTOR INDEX OPTIMIZATION
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'content_vector'
    ) THEN
        DROP INDEX IF EXISTS public.idx_items_vec_hnsw;
        
        EXECUTE 'CREATE INDEX idx_items_vec_hnsw 
                 ON public.items USING hnsw (content_vector vector_cosine_ops)
                 WITH (m = 16, ef_construction = 64)';
                 
        RAISE NOTICE 'Vector index created with HNSW optimization';
    ELSE
        RAISE NOTICE 'Skipping vector index - content_vector column not found';
    END IF;
END $$;

-- ============================================
-- ANALYZE TABLES
-- ============================================

ANALYZE public.items;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'items'
ORDER BY indexname;
