-- Migration: Helper functions for dashboard stats consumption
-- Purpose: Provide clean API for frontend to access stats and request refreshes

-- Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS public.get_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS public.request_stats_refresh(UUID);
DROP FUNCTION IF EXISTS public.get_stats_health();

-- 1. Get dashboard stats for a workspace
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_workspace_id UUID)
RETURNS TABLE (
    workspace_id UUID,
    active_items_count BIGINT,
    completed_items_count BIGINT,
    archived_items_count BIGINT,
    total_items_count BIGINT,
    tasks_count BIGINT,
    notes_count BIGINT,
    events_count BIGINT,
    high_priority_count BIGINT,
    medium_priority_count BIGINT,
    low_priority_count BIGINT,
    items_last_24h BIGINT,
    items_last_7d BIGINT,
    updates_last_24h BIGINT,
    total_estimated_minutes BIGINT,
    total_actual_minutes BIGINT,
    last_refreshed_at TIMESTAMPTZ,
    data_age_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.workspace_id,
        mv.active_items_count,
        mv.completed_items_count,
        mv.archived_items_count,
        mv.total_items_count,
        mv.tasks_count,
        mv.notes_count,
        mv.events_count,
        mv.high_priority_count,
        mv.medium_priority_count,
        mv.low_priority_count,
        mv.items_last_24h,
        mv.items_last_7d,
        mv.updates_last_24h,
        mv.total_estimated_minutes,
        mv.total_actual_minutes,
        mv.last_refreshed_at,
        EXTRACT(EPOCH FROM (NOW() - mv.last_refreshed_at))::INTEGER AS data_age_seconds
    FROM public.mv_dashboard_stats mv
    WHERE mv.workspace_id = p_workspace_id;
END;
$$;

-- 2. Request manual refresh (with rate limiting)
CREATE OR REPLACE FUNCTION public.request_stats_refresh(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    can_refresh BOOLEAN;
    result JSONB;
BEGIN
    -- Check if refresh is allowed (debounce)
    can_refresh := public.should_queue_refresh(p_workspace_id, 'mv_dashboard_stats', 60);
    
    IF can_refresh THEN
        -- Queue the refresh request
        INSERT INTO public.mv_refresh_queue (view_name, workspace_id, trigger_source)
        VALUES ('mv_dashboard_stats', p_workspace_id, 'manual')
        ON CONFLICT (view_name, workspace_id) WHERE processed_at IS NULL
        DO UPDATE SET 
            requested_at = NOW(),
            trigger_source = 'manual';
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Refresh queued successfully',
            'estimated_wait_seconds', 60
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Refresh requested too recently. Please wait.',
            'retry_after_seconds', 60
        );
    END IF;
    
    RETURN result;
END;
$$;

-- 3. Get system health status for stats
CREATE OR REPLACE FUNCTION public.get_stats_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    oldest_refresh TIMESTAMPTZ;
    pending_count INTEGER;
    job_status RECORD;
BEGIN
    -- Get oldest refresh timestamp
    SELECT MIN(last_refreshed_at) INTO oldest_refresh
    FROM public.mv_dashboard_stats;
    
    -- Get pending queue count
    SELECT COUNT(*) INTO pending_count
    FROM public.mv_refresh_queue
    WHERE processed_at IS NULL;
    
    -- Get cron job status
    SELECT * INTO job_status
    FROM cron.job
    WHERE jobname = 'refresh_dashboard_stats'
    LIMIT 1;
    
    result := jsonb_build_object(
        'materialized_view', jsonb_build_object(
            'name', 'mv_dashboard_stats',
            'oldest_data_age_seconds', EXTRACT(EPOCH FROM (NOW() - oldest_refresh))::INTEGER,
            'status', CASE 
                WHEN oldest_refresh > NOW() - INTERVAL '10 minutes' THEN 'healthy'
                WHEN oldest_refresh > NOW() - INTERVAL '30 minutes' THEN 'stale'
                ELSE 'critical'
            END
        ),
        'refresh_queue', jsonb_build_object(
            'pending_count', pending_count
        ),
        'cron_job', jsonb_build_object(
            'name', job_status.jobname,
            'schedule', job_status.schedule,
            'active', job_status.active
        ),
        'checked_at', NOW()
    );
    
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_stats_refresh(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_health() TO authenticated;

-- Documentation
COMMENT ON FUNCTION public.get_dashboard_stats IS 
    'Returns pre-aggregated dashboard statistics for a workspace. Includes data age for staleness indication.';
COMMENT ON FUNCTION public.request_stats_refresh IS 
    'Requests a manual refresh of dashboard stats. Rate limited to once per 60 seconds per workspace.';
COMMENT ON FUNCTION public.get_stats_health IS 
    'Returns health status of the stats system including cron job status and data freshness.';