-- ============================================================
-- Phase 3.2: Incremental View Maintenance (IVM) Simulation
-- ============================================================
-- Since pg_ivm is not available in Supabase, we simulate it using:
-- 1. Delta tracking triggers on source tables
-- 2. Incremental update functions that apply deltas
-- 3. LISTEN/NOTIFY for real-time push

-- ============================================================
-- SECTION 1: Delta Tracking Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mv_delta_queue (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Target view identification
    view_name TEXT NOT NULL,

    -- Delta type
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Affected dimensions
    workspace_id UUID NOT NULL,

    -- Delta values (positive for INSERT, negative for DELETE)
    delta_folders INT DEFAULT 0,
    delta_documents INT DEFAULT 0,
    delta_total INT DEFAULT 0,

    -- Processing status
    processed_at TIMESTAMPTZ,
    applied_to_version BIGINT
);

CREATE INDEX idx_mv_delta_queue_unprocessed
    ON public.mv_delta_queue (created_at)
    WHERE processed_at IS NULL;

CREATE INDEX idx_mv_delta_queue_workspace
    ON public.mv_delta_queue (workspace_id, created_at);

-- ============================================================
-- SECTION 2: Materialized Stats with Version Tracking
-- ============================================================

-- Drop existing MV and recreate as regular table for incremental updates
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_stats CASCADE;

CREATE TABLE IF NOT EXISTS public.dashboard_stats_live (
    workspace_id UUID PRIMARY KEY,

    -- Counters (maintained incrementally)
    folders_count BIGINT DEFAULT 0,
    documents_count BIGINT DEFAULT 0,
    total_items_count BIGINT DEFAULT 0,

    -- Time-based metrics (require periodic full recalc)
    items_last_24h BIGINT DEFAULT 0,
    items_last_7d BIGINT DEFAULT 0,
    updates_last_24h BIGINT DEFAULT 0,

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    update_version BIGINT DEFAULT 0
);

-- Grant access
GRANT SELECT ON public.dashboard_stats_live TO authenticated;

-- ============================================================
-- SECTION 3: Delta Capture Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION capture_item_delta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta_folders INT := 0;
    v_delta_documents INT := 0;
    v_delta_total INT := 0;
    v_workspace_id UUID;
BEGIN
    -- Determine operation and calculate deltas
    IF TG_OP = 'INSERT' THEN
        v_workspace_id := NEW.workspace_id;
        v_delta_total := 1;
        IF NEW.item_type = 'folder' THEN
            v_delta_folders := 1;
        ELSIF NEW.item_type = 'document' THEN
            v_delta_documents := 1;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_workspace_id := OLD.workspace_id;
        v_delta_total := -1;
        IF OLD.item_type = 'folder' THEN
            v_delta_folders := -1;
        ELSIF OLD.item_type = 'document' THEN
            v_delta_documents := -1;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle workspace change
        IF OLD.workspace_id != NEW.workspace_id THEN
            -- Queue deletion from old workspace
            INSERT INTO public.mv_delta_queue (
                view_name, operation, workspace_id,
                delta_folders, delta_documents, delta_total
            ) VALUES (
                'dashboard_stats_live', 'DELETE', OLD.workspace_id,
                CASE WHEN OLD.item_type = 'folder' THEN -1 ELSE 0 END,
                CASE WHEN OLD.item_type = 'document' THEN -1 ELSE 0 END,
                -1
            );

            -- Queue insertion to new workspace
            v_workspace_id := NEW.workspace_id;
            v_delta_total := 1;
            IF NEW.item_type = 'folder' THEN
                v_delta_folders := 1;
            ELSIF NEW.item_type = 'document' THEN
                v_delta_documents := 1;
            END IF;
        ELSE
            -- Handle type change within same workspace
            IF OLD.item_type != NEW.item_type THEN
                v_workspace_id := NEW.workspace_id;
                IF OLD.item_type = 'folder' THEN v_delta_folders := -1; END IF;
                IF OLD.item_type = 'document' THEN v_delta_documents := -1; END IF;
                IF NEW.item_type = 'folder' THEN v_delta_folders := v_delta_folders + 1; END IF;
                IF NEW.item_type = 'document' THEN v_delta_documents := v_delta_documents + 1; END IF;
            ELSE
                -- No relevant change
                RETURN COALESCE(NEW, OLD);
            END IF;
        END IF;
    END IF;

    -- Only queue if there's an actual delta
    IF v_delta_total != 0 OR v_delta_folders != 0 OR v_delta_documents != 0 THEN
        INSERT INTO public.mv_delta_queue (
            view_name, operation, workspace_id,
            delta_folders, delta_documents, delta_total
        ) VALUES (
            'dashboard_stats_live', TG_OP, v_workspace_id,
            v_delta_folders, v_delta_documents, v_delta_total
        );

        -- Notify listeners immediately
        PERFORM pg_notify('dashboard_delta', json_build_object(
            'workspace_id', v_workspace_id,
            'delta_folders', v_delta_folders,
            'delta_documents', v_delta_documents,
            'delta_total', v_delta_total,
            'operation', TG_OP
        )::TEXT);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to items table
DROP TRIGGER IF EXISTS trg_capture_item_delta ON public.items;
CREATE TRIGGER trg_capture_item_delta
    AFTER INSERT OR UPDATE OR DELETE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION capture_item_delta();

-- ============================================================
-- SECTION 4: Delta Application Function
-- ============================================================

CREATE OR REPLACE FUNCTION apply_dashboard_deltas(
    p_batch_size INT DEFAULT 100
)
RETURNS TABLE (
    deltas_applied INT,
    workspaces_updated UUID[],
    new_version BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deltas_applied INT := 0;
    v_workspaces UUID[] := '{}';
    v_max_version BIGINT;
    v_workspace_id UUID;
    v_total_delta_folders BIGINT;
    v_total_delta_documents BIGINT;
    v_total_delta_total BIGINT;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(update_version), 0) + 1 INTO v_max_version
    FROM public.dashboard_stats_live;

    -- Aggregate deltas per workspace
    FOR v_workspace_id, v_total_delta_folders, v_total_delta_documents, v_total_delta_total IN
        SELECT
            workspace_id,
            SUM(delta_folders),
            SUM(delta_documents),
            SUM(delta_total)
        FROM public.mv_delta_queue
        WHERE processed_at IS NULL
          AND view_name = 'dashboard_stats_live'
        GROUP BY workspace_id
        LIMIT p_batch_size
    LOOP
        -- Upsert stats
        INSERT INTO public.dashboard_stats_live (
            workspace_id, folders_count, documents_count, total_items_count,
            last_updated_at, update_version
        ) VALUES (
            v_workspace_id,
            GREATEST(0, v_total_delta_folders),
            GREATEST(0, v_total_delta_documents),
            GREATEST(0, v_total_delta_total),
            NOW(),
            v_max_version
        )
        ON CONFLICT (workspace_id) DO UPDATE SET
            folders_count = GREATEST(0, dashboard_stats_live.folders_count + v_total_delta_folders),
            documents_count = GREATEST(0, dashboard_stats_live.documents_count + v_total_delta_documents),
            total_items_count = GREATEST(0, dashboard_stats_live.total_items_count + v_total_delta_total),
            last_updated_at = NOW(),
            update_version = v_max_version;

        v_workspaces := array_append(v_workspaces, v_workspace_id);
        v_deltas_applied := v_deltas_applied + 1;

        -- Notify UI of update
        PERFORM pg_notify('stats_updated', json_build_object(
            'workspace_id', v_workspace_id,
            'version', v_max_version
        )::TEXT);
    END LOOP;

    -- Mark deltas as processed
    UPDATE public.mv_delta_queue
    SET processed_at = NOW(), applied_to_version = v_max_version
    WHERE processed_at IS NULL
      AND view_name = 'dashboard_stats_live'
      AND workspace_id = ANY(v_workspaces);

    RETURN QUERY SELECT v_deltas_applied, v_workspaces, v_max_version;
END;
$$;

-- ============================================================
-- SECTION 5: Real-time Delta Application (runs every second)
-- ============================================================

-- Create a pg_cron job that runs every second (or use application-side loop)
-- Note: pg_cron minimum interval is 1 minute, so we'll use application-side polling

-- Helper function for immediate application
CREATE OR REPLACE FUNCTION apply_single_delta(p_delta_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta RECORD;
BEGIN
    SELECT * INTO v_delta FROM public.mv_delta_queue WHERE id = p_delta_id FOR UPDATE SKIP LOCKED;

    IF NOT FOUND OR v_delta.processed_at IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    -- Apply directly
    INSERT INTO public.dashboard_stats_live (
        workspace_id, folders_count, documents_count, total_items_count,
        last_updated_at
    ) VALUES (
        v_delta.workspace_id,
        GREATEST(0, v_delta.delta_folders),
        GREATEST(0, v_delta.delta_documents),
        GREATEST(0, v_delta.delta_total),
        NOW()
    )
    ON CONFLICT (workspace_id) DO UPDATE SET
        folders_count = GREATEST(0, dashboard_stats_live.folders_count + v_delta.delta_folders),
        documents_count = GREATEST(0, dashboard_stats_live.documents_count + v_delta.delta_documents),
        total_items_count = GREATEST(0, dashboard_stats_live.total_items_count + v_delta.delta_total),
        last_updated_at = NOW(),
        update_version = dashboard_stats_live.update_version + 1;

    -- Mark as processed
    UPDATE public.mv_delta_queue SET processed_at = NOW() WHERE id = p_delta_id;

    RETURN TRUE;
END;
$$;

-- ============================================================
-- SECTION 6: Initial Population
-- ============================================================

INSERT INTO public.dashboard_stats_live (
    workspace_id, folders_count, documents_count, total_items_count
)
SELECT
    workspace_id,
    COUNT(*) FILTER (WHERE item_type = 'folder'),
    COUNT(*) FILTER (WHERE item_type = 'document'),
    COUNT(*)
FROM public.items
GROUP BY workspace_id
ON CONFLICT (workspace_id) DO UPDATE SET
    folders_count = EXCLUDED.folders_count,
    documents_count = EXCLUDED.documents_count,
    total_items_count = EXCLUDED.total_items_count,
    last_updated_at = NOW();