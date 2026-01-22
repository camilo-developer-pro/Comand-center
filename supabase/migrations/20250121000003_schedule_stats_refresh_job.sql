-- Migration: Schedule pg_cron job for dashboard stats refresh
-- Frequency: Every 5 minutes
-- Method: CONCURRENTLY (zero-lock, requires UNIQUE index)

-- Remove existing job if it exists (idempotent)
SELECT cron.unschedule('refresh_dashboard_stats')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'refresh_dashboard_stats'
);

-- Schedule the refresh job
-- Cron expression: */5 * * * * = every 5 minutes
SELECT cron.schedule(
    'refresh_dashboard_stats',                                    -- job name (unique identifier)
    '*/5 * * * *',                                                -- cron schedule (every 5 minutes)
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_stats$$  -- SQL command
);

-- Verify job was created
DO $$
DECLARE
    job_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'refresh_dashboard_stats'
    ) INTO job_exists;
    
    IF NOT job_exists THEN
        RAISE EXCEPTION 'Failed to create pg_cron job: refresh_dashboard_stats';
    END IF;
    
    RAISE NOTICE 'pg_cron job "refresh_dashboard_stats" scheduled successfully';
END $$;

-- Document the job in a comments table (optional but recommended)
COMMENT ON EXTENSION pg_cron IS 'Jobs: refresh_dashboard_stats (*/5 * * * *) - Refreshes mv_dashboard_stats concurrently';