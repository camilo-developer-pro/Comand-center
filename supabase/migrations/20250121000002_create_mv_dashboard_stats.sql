-- Migration: Create materialized view for dashboard statistics
-- Purpose: Pre-aggregated stats to eliminate real-time aggregation locks
-- Refresh Strategy: CONCURRENTLY via pg_cron every 5 minutes

-- Drop existing view if recreating (safe for development)
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_stats;

-- Create the materialized view
CREATE MATERIALIZED VIEW public.mv_dashboard_stats AS
SELECT
    -- Grouping key
    i.workspace_id,

    -- Item counts by type
    COUNT(*) FILTER (WHERE i.item_type = 'folder') AS folders_count,
    COUNT(*) FILTER (WHERE i.item_type = 'document') AS documents_count,
    COUNT(*) AS total_items_count,

    -- Time-based metrics
    COUNT(*) FILTER (WHERE i.created_at >= NOW() - INTERVAL '24 hours') AS items_last_24h,
    COUNT(*) FILTER (WHERE i.created_at >= NOW() - INTERVAL '7 days') AS items_last_7d,
    COUNT(*) FILTER (WHERE i.updated_at >= NOW() - INTERVAL '24 hours') AS updates_last_24h,

    -- Metadata
    NOW() AS last_refreshed_at

FROM public.items i
GROUP BY i.workspace_id

WITH NO DATA;  -- Don't populate on creation; first refresh will populate

-- CRITICAL: Create UNIQUE index for CONCURRENTLY refresh capability
-- Without this index, REFRESH MATERIALIZED VIEW CONCURRENTLY will fail
CREATE UNIQUE INDEX idx_mv_dashboard_stats_workspace_id
    ON public.mv_dashboard_stats (workspace_id);

-- Additional index for query performance
CREATE INDEX idx_mv_dashboard_stats_refreshed
    ON public.mv_dashboard_stats (last_refreshed_at);

-- Initial data population
REFRESH MATERIALIZED VIEW public.mv_dashboard_stats;

-- Grant read access to authenticated users
GRANT SELECT ON public.mv_dashboard_stats TO authenticated;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW public.mv_dashboard_stats IS
    'Pre-aggregated dashboard statistics by workspace. Refreshed every 5 minutes via pg_cron. Query this instead of aggregating items table directly.';