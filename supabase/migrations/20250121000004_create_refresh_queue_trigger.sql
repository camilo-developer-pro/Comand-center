-- Migration: Smart trigger system for debounced materialized view refresh
-- Purpose: Queue refresh requests when items change, with debounce logic
-- Integration: Works alongside pg_cron; provides finer-grained control

-- 1. Create the refresh queue table
CREATE TABLE IF NOT EXISTS public.mv_refresh_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    view_name TEXT NOT NULL,
    workspace_id UUID NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    trigger_source TEXT  -- 'insert', 'update', 'delete', 'manual'
);

-- Prevent duplicate pending requests for same workspace
CREATE UNIQUE INDEX uq_pending_refresh
    ON public.mv_refresh_queue (view_name, workspace_id)
    WHERE processed_at IS NULL;

-- Index for efficient queue processing
CREATE INDEX idx_refresh_queue_pending 
    ON public.mv_refresh_queue (requested_at) 
    WHERE processed_at IS NULL;

CREATE INDEX idx_refresh_queue_workspace 
    ON public.mv_refresh_queue (workspace_id, view_name);

-- 2. Create the debounce check function
CREATE OR REPLACE FUNCTION public.should_queue_refresh(
    p_workspace_id UUID,
    p_view_name TEXT DEFAULT 'mv_dashboard_stats',
    p_debounce_seconds INTEGER DEFAULT 30  -- Minimum seconds between queue entries
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    last_request TIMESTAMPTZ;
BEGIN
    -- Check for recent pending or processed request
    SELECT GREATEST(requested_at, COALESCE(processed_at, '1970-01-01'))
    INTO last_request
    FROM public.mv_refresh_queue
    WHERE workspace_id = p_workspace_id 
      AND view_name = p_view_name
    ORDER BY requested_at DESC
    LIMIT 1;
    
    -- If no recent request, or enough time has passed, allow queuing
    IF last_request IS NULL OR 
       last_request < NOW() - (p_debounce_seconds || ' seconds')::INTERVAL THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 3. Create the queue insert function
CREATE OR REPLACE FUNCTION public.queue_stats_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_workspace_id UUID;
BEGIN
    -- Determine the workspace_id from the affected row
    IF TG_OP = 'DELETE' THEN
        affected_workspace_id := OLD.workspace_id;
    ELSE
        affected_workspace_id := NEW.workspace_id;
    END IF;
    
    -- Check debounce before queuing
    IF public.should_queue_refresh(affected_workspace_id, 'mv_dashboard_stats', 30) THEN
        INSERT INTO public.mv_refresh_queue (view_name, workspace_id, trigger_source)
        VALUES ('mv_dashboard_stats', affected_workspace_id, TG_OP)
        ON CONFLICT (view_name, workspace_id)
        DO UPDATE SET
            requested_at = NOW(),
            trigger_source = TG_OP;
    END IF;
    
    -- Return appropriate row for trigger
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 4. Attach trigger to items table
DROP TRIGGER IF EXISTS trg_items_refresh_stats ON public.items;

CREATE TRIGGER trg_items_refresh_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_stats_refresh();

-- 5. Create function to process the queue (called by pg_cron or manually)
CREATE OR REPLACE FUNCTION public.process_refresh_queue()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    processed_count INTEGER := 0;
    pending_record RECORD;
BEGIN
    -- Process all pending refresh requests
    FOR pending_record IN 
        SELECT DISTINCT view_name
        FROM public.mv_refresh_queue
        WHERE processed_at IS NULL
        ORDER BY view_name
    LOOP
        -- Refresh the materialized view
        IF pending_record.view_name = 'mv_dashboard_stats' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_stats;
        END IF;
        
        -- Mark all pending requests for this view as processed
        UPDATE public.mv_refresh_queue
        SET processed_at = NOW()
        WHERE view_name = pending_record.view_name
          AND processed_at IS NULL;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    -- Cleanup old processed records (older than 24 hours)
    DELETE FROM public.mv_refresh_queue
    WHERE processed_at IS NOT NULL 
      AND processed_at < NOW() - INTERVAL '24 hours';
    
    RETURN processed_count;
END;
$$;

-- 6. Schedule queue processor (more frequent than main refresh)
-- This checks the queue every minute and processes if needed
SELECT cron.schedule(
    'process_refresh_queue',
    '* * * * *',  -- Every minute
    $$SELECT public.process_refresh_queue()$$
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.mv_refresh_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_queue_refresh TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_refresh_queue TO postgres;

-- Documentation
COMMENT ON TABLE public.mv_refresh_queue IS 
    'Queue for debounced materialized view refresh requests. Triggers add entries; pg_cron processes them.';
COMMENT ON FUNCTION public.queue_stats_refresh IS 
    'Trigger function that queues refresh requests with 30-second debounce.';
COMMENT ON FUNCTION public.process_refresh_queue IS 
    'Processes pending refresh requests and performs CONCURRENTLY refresh.';