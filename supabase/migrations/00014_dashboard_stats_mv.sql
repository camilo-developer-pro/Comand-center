-- ============================================================
-- Migration: 00014_dashboard_stats_mv.sql
-- Purpose: High-performance dashboard analytics using Materialized View
-- Date: 2026-01-21
-- Author: Backend Reliability Engineering
-- ============================================================
-- This migration creates a materialized view that pre-aggregates
-- dashboard statistics per workspace, eliminating the need for
-- expensive JOIN operations on every page load.
--
-- Performance Target: Dashboard loads in <100ms (hitting MV)
-- Refresh Strategy: CONCURRENTLY via pg_cron (future phase)
-- ============================================================

-- ============================================================
-- SECTION 1: Drop existing view if re-running migration
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_mv;

-- ============================================================
-- SECTION 2: Create Materialized View
-- Aggregates: CRM pipeline value + Document counts per workspace
-- ============================================================
CREATE MATERIALIZED VIEW dashboard_stats_mv AS
SELECT
    w.id AS workspace_id,
    w.name AS workspace_name,
    
    -- CRM Metrics
    -- Total pipeline value excludes 'lost' leads
    COALESCE(SUM(l.value) FILTER (WHERE l.status NOT IN ('lost')), 0) AS total_pipeline_value,
    
    -- Total won value (closed deals)
    COALESCE(SUM(l.value) FILTER (WHERE l.status = 'won'), 0) AS total_won_value,
    
    -- Lead counts
    COUNT(DISTINCT l.id) AS total_leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'new') AS new_leads_count,
    COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won') AS won_leads_count,
    
    -- Document Metrics
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT d.id) FILTER (WHERE d.is_archived = FALSE) AS active_documents_count,
    
    -- Metadata
    NOW() AS last_refreshed_at
FROM workspaces w
LEFT JOIN crm_leads l ON l.workspace_id = w.id
LEFT JOIN documents d ON d.workspace_id = w.id
GROUP BY w.id, w.name;

-- ============================================================
-- SECTION 3: Create UNIQUE INDEX (Required for CONCURRENTLY)
-- ============================================================
-- This index is MANDATORY for REFRESH MATERIALIZED VIEW CONCURRENTLY
-- Without it, concurrent refresh will fail
CREATE UNIQUE INDEX idx_dashboard_stats_mv_workspace 
ON dashboard_stats_mv(workspace_id);

-- ============================================================
-- SECTION 4: Additional performance indexes
-- ============================================================
-- Index for sorting by pipeline value (e.g., "Top Workspaces" widget)
CREATE INDEX idx_dashboard_stats_mv_pipeline 
ON dashboard_stats_mv(total_pipeline_value DESC);

-- Index for sorting by document count
CREATE INDEX idx_dashboard_stats_mv_documents 
ON dashboard_stats_mv(total_documents DESC);

-- ============================================================
-- SECTION 5: Initial data population
-- ============================================================
-- Populate the materialized view with current data
REFRESH MATERIALIZED VIEW dashboard_stats_mv;

-- ============================================================
-- SECTION 6: Create helper function for safe refresh
-- ============================================================
-- This function allows manual refresh via Supabase RPC
-- Future: Will be called automatically by pg_cron
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- CONCURRENTLY allows reads during refresh
    -- Requires the UNIQUE INDEX created above
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv;
END;
$$;

-- Grant execute to authenticated users (for manual refresh via RPC)
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO authenticated;

-- ============================================================
-- SECTION 7: RPC Function for fetching stats (bypasses RLS on MV)
-- Security: Validates workspace membership before returning data
-- ============================================================
-- Materialized views don't support RLS, so we use a SECURITY DEFINER
-- function that performs manual access control checks
CREATE OR REPLACE FUNCTION get_dashboard_stats(target_workspace_id UUID)
RETURNS TABLE (
    workspace_id UUID,
    workspace_name TEXT,
    total_pipeline_value NUMERIC,
    total_won_value NUMERIC,
    total_leads BIGINT,
    new_leads_count BIGINT,
    won_leads_count BIGINT,
    total_documents BIGINT,
    active_documents_count BIGINT,
    last_refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Security Check: Verify user is member of workspace
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = target_workspace_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Not a member of this workspace';
    END IF;
    
    -- Return stats for the workspace
    RETURN QUERY
    SELECT 
        mv.workspace_id,
        mv.workspace_name,
        mv.total_pipeline_value,
        mv.total_won_value,
        mv.total_leads,
        mv.new_leads_count,
        mv.won_leads_count,
        mv.total_documents,
        mv.active_documents_count,
        mv.last_refreshed_at
    FROM dashboard_stats_mv mv
    WHERE mv.workspace_id = target_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;

-- ============================================================
-- SECTION 8: Comments for documentation
-- ============================================================
COMMENT ON MATERIALIZED VIEW dashboard_stats_mv IS 
'Pre-aggregated dashboard statistics per workspace. Refreshed via refresh_dashboard_stats() function.';

COMMENT ON FUNCTION get_dashboard_stats(UUID) IS 
'Securely fetch dashboard stats for a workspace. Validates workspace membership before returning data.';

COMMENT ON FUNCTION refresh_dashboard_stats() IS 
'Refresh the dashboard_stats_mv materialized view. Safe to call concurrently with reads.';
