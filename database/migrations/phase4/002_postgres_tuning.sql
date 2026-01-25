-- ============================================================================
-- Command Center V3.1 - Phase 4: PostgreSQL Memory Tuning
-- Migration: 002_postgres_tuning
-- Description: Memory settings for vector index builds and query performance
-- ============================================================================

-- NOTE: These settings require superuser privileges.
-- On Supabase, some settings are managed via the dashboard.
-- This file documents the recommended settings.

-- ============================================================================
-- RECOMMENDED SETTINGS (Apply via Supabase Dashboard > Database > Settings)
-- ============================================================================

/*
-- work_mem: Memory for sort operations and hash tables
-- Default: 4MB, Recommended: 256MB for vector operations
-- This affects: ORDER BY, DISTINCT, hash joins, vector index builds
ALTER SYSTEM SET work_mem = '256MB';

-- maintenance_work_mem: Memory for maintenance operations
-- Default: 64MB, Recommended: 1GB for index builds
-- This affects: CREATE INDEX, VACUUM, ALTER TABLE ADD FOREIGN KEY
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- effective_cache_size: Estimate of disk cache available
-- Default: 4GB, Recommended: 75% of available RAM
-- This affects: Query planner's cost estimates
ALTER SYSTEM SET effective_cache_size = '12GB';

-- random_page_cost: Planner's estimate of cost of non-sequential disk access
-- Default: 4.0, Recommended: 1.1 for SSD storage (Supabase uses SSDs)
-- This affects: Index scan vs sequential scan decisions
ALTER SYSTEM SET random_page_cost = 1.1;

-- After changing settings, reload configuration:
SELECT pg_reload_conf();
*/

-- ============================================================================
-- SESSION-LEVEL SETTINGS (Can be applied per-connection)
-- These can be set in application code for specific operations
-- ============================================================================

-- Example: Before running a large index build operation
-- SET LOCAL work_mem = '512MB';
-- SET LOCAL maintenance_work_mem = '2GB';

-- ============================================================================
-- HNSW-SPECIFIC SETTINGS
-- ============================================================================

-- ef_search: Runtime search depth (trade-off: accuracy vs speed)
-- Higher = more accurate but slower
-- This can be set per-session or per-query
-- Default: 40, Recommended: 100 for high accuracy, 20 for speed

-- Example: Set for current session
-- SET hnsw.ef_search = 100;

-- ============================================================================
-- CREATE HELPER FUNCTION FOR DYNAMIC TUNING
-- ============================================================================

CREATE OR REPLACE FUNCTION set_vector_search_accuracy(accuracy_level TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE accuracy_level
        WHEN 'high' THEN
            PERFORM set_config('hnsw.ef_search', '200', true);
            PERFORM set_config('work_mem', '512MB', true);
        WHEN 'medium' THEN
            PERFORM set_config('hnsw.ef_search', '100', true);
            PERFORM set_config('work_mem', '256MB', true);
        WHEN 'fast' THEN
            PERFORM set_config('hnsw.ef_search', '40', true);
            PERFORM set_config('work_mem', '128MB', true);
        ELSE
            RAISE EXCEPTION 'Invalid accuracy level: %. Use high, medium, or fast.', accuracy_level;
    END CASE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_vector_search_accuracy(TEXT) TO authenticated;
