-- ============================================================================
-- Command Center V3.1 - Phase 4: Performance Index Optimization
-- Migration: 001_performance_indexes
-- Description: Optimized indexes for production workloads
-- NOTE: CONCURRENTLY was removed to maintain compatibility with transaction-wrapped migration tools.
-- For zero-downtime production builds, run these manually individually with CONCURRENTLY.
-- ============================================================================

-- ============================================================================
-- SECTION 1: GIST INDEX OPTIMIZATION FOR LTREE
-- Explanation: siglen=256 reduces hash collisions for deep hierarchies
-- ============================================================================

-- Drop existing basic GIST index if it exists
DROP INDEX IF EXISTS idx_blocks_parent_path_gist;

-- Create optimized GIST index with increased signature length
-- siglen=256 (default is 124) provides better selectivity for paths > 10 levels deep
CREATE INDEX IF NOT EXISTS idx_blocks_parent_path_gist_optimized
ON public.blocks USING GIST (parent_path gist_ltree_ops(siglen=256));

-- Also optimize documents.path for folder navigation
DROP INDEX IF EXISTS idx_documents_path_gist;

CREATE INDEX IF NOT EXISTS idx_documents_path_gist_optimized
ON public.documents USING GIST (path gist_ltree_ops(siglen=256));

-- ============================================================================
-- SECTION 2: B-TREE COMPOSITE INDEXES FOR BLOCK RETRIEVAL
-- ============================================================================

-- Drop existing basic indexes
DROP INDEX IF EXISTS idx_blocks_sort_order;
DROP INDEX IF EXISTS idx_blocks_document_id;

-- Composite covering index for the most common query pattern:
-- SELECT * FROM blocks WHERE document_id = ? ORDER BY sort_order
-- INCLUDE clause adds frequently selected columns to avoid heap lookups
CREATE INDEX IF NOT EXISTS idx_blocks_document_sort_covering
ON public.blocks (document_id, sort_order COLLATE "C")
INCLUDE (type, content, parent_path);

-- Index for sibling queries (blocks with same parent)
CREATE INDEX IF NOT EXISTS idx_blocks_parent_sort
ON public.blocks (document_id, parent_path, sort_order COLLATE "C");

-- ============================================================================
-- SECTION 3: VECTOR INDEX OPTIMIZATION
-- ============================================================================

-- Drop existing IVFFLAT index (we're switching to HNSW)
DROP INDEX IF EXISTS idx_blocks_embedding;
DROP INDEX IF EXISTS idx_blocks_embedding_hnsw;

-- HNSW provides better query performance than IVFFLAT for our workload
-- m=16: connections per node (higher = more accurate, slower build)
-- ef_construction=64: build-time search depth (higher = more accurate index)
-- Note: This requires vector extension and may take several minutes for large tables
CREATE INDEX IF NOT EXISTS idx_blocks_embedding_hnsw_optimized
ON public.blocks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Partial index for blocks with embeddings only
-- Avoids scanning NULL embeddings during similarity search
CREATE INDEX IF NOT EXISTS idx_blocks_embedding_hnsw_partial
ON public.blocks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE embedding IS NOT NULL;

-- ============================================================================
-- SECTION 4: KNOWLEDGE GRAPH INDEXES
-- ============================================================================

-- Composite index for graph traversal queries
CREATE INDEX IF NOT EXISTS idx_kg_edges_traversal
ON public.knowledge_graph_edges (
    workspace_id,
    source_entity,
    target_entity,
    valid_to
)
WHERE valid_to IS NULL; -- Only active edges

-- Index for reverse lookups (finding what points to an entity)
CREATE INDEX IF NOT EXISTS idx_kg_edges_reverse_lookup
ON public.knowledge_graph_edges (
    workspace_id,
    target_entity,
    source_entity
)
WHERE valid_to IS NULL;

-- ============================================================================
-- SECTION 5: DOCUMENT LISTING OPTIMIZATION
-- ============================================================================

-- Composite index for workspace document listing with common sort patterns
CREATE INDEX IF NOT EXISTS idx_documents_workspace_listing
ON public.documents (
    workspace_id,
    is_archived,
    updated_at DESC
)
INCLUDE (title, icon, parent_id)
WHERE is_archived = false;

-- ============================================================================
-- SECTION 6: ANALYZE TABLES
-- Force statistics update for query planner
-- ============================================================================

ANALYZE public.blocks;
ANALYZE public.documents;
ANALYZE public.knowledge_graph_edges;
ANALYZE public.workspaces;
