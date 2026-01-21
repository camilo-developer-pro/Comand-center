/*
 * ============================================================
 * Migration: 00015_dashboard_cron_job.sql
 * Purpose: Schedule automatic refresh of dashboard_stats_mv every 5 minutes
 * Date: 2026-01-21
 * Dependency: Requires 00014_dashboard_stats_mv.sql to be applied first
 * ============================================================
 *
 * MANUAL SETUP REQUIRED (One-time in Supabase Dashboard):
 * 
 * 1. Go to Supabase Dashboard > Database > Extensions
 * 2. Search for "pg_cron"
 * 3. Click "Enable" on the pg_cron extension
 * 4. Wait for extension to be enabled (~30 seconds)
 * 5. Then run this migration via SQL Editor
 *
 * VERIFICATION:
 * After running the migration, execute:
 *   SELECT * FROM cron.job WHERE jobname = 'refresh-dashboard-stats';
 * 
 * You should see:
 *   jobid | schedule      | command                                              | jobname
 *   ------+---------------+------------------------------------------------------+-------------------------
 *   1     | * / 5 * * * * | REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_... | refresh-dashboard-stats
 *
 * MONITORING:
 * To check job execution history:
 *   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
 *
 * To check job status via RPC:
 *   SELECT * FROM get_cron_job_status();
 * ============================================================
 */

-- ============================================================
-- SECTION 1: Enable pg_cron extension
-- NOTE: This may need to be done manually in Supabase Dashboard
-- Go to: Database > Extensions > Search "pg_cron" > Enable
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres (required for cron jobs)
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================
-- SECTION 2: Remove existing job if re-running migration
-- ============================================================
DO $$
BEGIN
    -- Unschedule the job if it exists
    IF EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'refresh-dashboard-stats'
    ) THEN
        PERFORM cron.unschedule('refresh-dashboard-stats');
    END IF;
END $$;

-- ============================================================
-- SECTION 3: Schedule the refresh job
-- Runs every 5 minutes using CONCURRENTLY (no table lock)
-- ============================================================
SELECT cron.schedule(
    'refresh-dashboard-stats',           -- Job name (unique identifier)
    '*/5 * * * *',                        -- Cron expression: every 5 minutes
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv$$
);

-- ============================================================
-- SECTION 4: Create monitoring function for job status
-- ============================================================
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE (
    job_id BIGINT,
    job_name TEXT,
    schedule TEXT,
    command TEXT,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    last_status TEXT,
    run_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobid,
        j.jobname,
        j.schedule,
        j.command,
        (SELECT MAX(end_time) FROM cron.job_run_details WHERE jobid = j.jobid) as last_run,
        -- Calculate next run time (approximate, based on last run + 5 minutes)
        CASE 
            WHEN (SELECT MAX(end_time) FROM cron.job_run_details WHERE jobid = j.jobid) IS NOT NULL
            THEN (SELECT MAX(end_time) FROM cron.job_run_details WHERE jobid = j.jobid) + INTERVAL '5 minutes'
            ELSE NOW() + INTERVAL '5 minutes'
        END as next_run,
        COALESCE(
            (SELECT status FROM cron.job_run_details 
             WHERE jobid = j.jobid 
             ORDER BY start_time DESC LIMIT 1),
            'never_run'
        ) as last_status,
        (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid) as run_count
    FROM cron.job j
    WHERE j.jobname = 'refresh-dashboard-stats';
END;
$$;

GRANT EXECUTE ON FUNCTION get_cron_job_status() TO authenticated;

-- ============================================================
-- SECTION 5: Create function to get recent job execution history
-- ============================================================
CREATE OR REPLACE FUNCTION get_cron_job_history(limit_count INT DEFAULT 10)
RETURNS TABLE (
    job_name TEXT,
    run_id BIGINT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INTERVAL,
    status TEXT,
    return_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobname,
        jrd.runid,
        jrd.start_time,
        jrd.end_time,
        jrd.end_time - jrd.start_time as duration,
        jrd.status,
        jrd.return_message
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE j.jobname = 'refresh-dashboard-stats'
    ORDER BY jrd.start_time DESC
    LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cron_job_history(INT) TO authenticated;

-- ============================================================
-- SECTION 6: Create function to manually trigger refresh
-- (Useful for testing or forcing an immediate update)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_dashboard_refresh()
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Record start time
    v_start_time := NOW();
    
    -- Perform the refresh
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv;
        v_end_time := NOW();
        
        RETURN QUERY SELECT 
            TRUE, 
            'Dashboard stats refreshed successfully in ' || 
            EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::TEXT || 'ms',
            v_end_time;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            'Refresh failed: ' || SQLERRM,
            NULL::TIMESTAMPTZ;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_dashboard_refresh() TO authenticated;

-- ============================================================
-- SECTION 7: Comments for documentation
-- ============================================================
COMMENT ON FUNCTION get_cron_job_status() IS 
'Returns the current status of the dashboard refresh cron job, including last run time and next scheduled run.';

COMMENT ON FUNCTION get_cron_job_history(INT) IS 
'Returns the execution history of the dashboard refresh job. Default limit is 10 most recent runs.';

COMMENT ON FUNCTION trigger_dashboard_refresh() IS 
'Manually trigger an immediate refresh of the dashboard stats materialized view. Useful for testing or forcing updates.';

-- ============================================================
-- VERIFICATION QUERIES (Run these after migration)
-- ============================================================
-- 1. Verify job was created:
--    SELECT * FROM cron.job WHERE jobname = 'refresh-dashboard-stats';
--
-- 2. Check job status:
--    SELECT * FROM get_cron_job_status();
--
-- 3. View execution history:
--    SELECT * FROM get_cron_job_history(5);
--
-- 4. Manually trigger refresh (for testing):
--    SELECT * FROM trigger_dashboard_refresh();
--
-- 5. Verify materialized view was updated:
--    SELECT workspace_name, last_refreshed_at FROM dashboard_stats_mv;
-- ============================================================
