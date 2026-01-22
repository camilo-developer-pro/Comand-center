-- File: migrations/012_logs_migration.sql

-- Initialize migration tracking
INSERT INTO migration.migration_status (
    migration_name,
    phase,
    started_at,
    notes
) VALUES (
    'logs_to_episodic_events',
    'initializing',
    NOW(),
    'Migrate public.logs to episodic_memory.events using dual-write pattern'
) ON CONFLICT (migration_name) DO NOTHING;

-- Count source rows (assuming public.logs exists - adapt as needed)
-- UPDATE migration.migration_status
-- SET total_rows = (SELECT COUNT(*) FROM public.logs)
-- WHERE migration_name = 'logs_to_episodic_events';

CREATE OR REPLACE FUNCTION migration.fn_map_log_level(p_level TEXT)
RETURNS episodic_memory.event_severity
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE upper(p_level)
        WHEN 'DEBUG' THEN 'DEBUG'::episodic_memory.event_severity
        WHEN 'INFO' THEN 'INFO'::episodic_memory.event_severity
        WHEN 'NOTICE' THEN 'NOTICE'::episodic_memory.event_severity
        WHEN 'WARN' THEN 'WARNING'::episodic_memory.event_severity
        WHEN 'WARNING' THEN 'WARNING'::episodic_memory.event_severity
        WHEN 'ERROR' THEN 'ERROR'::episodic_memory.event_severity
        WHEN 'CRITICAL' THEN 'CRITICAL'::episodic_memory.event_severity
        WHEN 'FATAL' THEN 'CRITICAL'::episodic_memory.event_severity
        ELSE 'INFO'::episodic_memory.event_severity
    END;
$$;

CREATE OR REPLACE FUNCTION migration.fn_transform_log_to_event(
    p_log RECORD
)
RETURNS episodic_memory.events
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_event episodic_memory.events;
BEGIN
    v_event.id := generate_uuidv7();
    v_event.created_at := COALESCE(p_log.created_at, NOW());
    v_event.severity := migration.fn_map_log_level(p_log.level);
    v_event.category := 'SYSTEM';  -- Default, adjust based on metadata
    v_event.event_type := COALESCE(p_log.metadata->>'event_type', 'log_entry');
    v_event.summary := p_log.message;
    v_event.details := COALESCE(p_log.metadata, '{}');
    v_event.actor_id := p_log.user_id;
    v_event.actor_type := CASE WHEN p_log.user_id IS NOT NULL THEN 'user' ELSE 'system' END;
    v_event.session_id := p_log.session_id;
    v_event.source_system := 'legacy_logs';
    v_event.correlation_id := (p_log.metadata->>'correlation_id')::UUID;

    -- Store legacy ID for reference
    v_event.details := v_event.details || jsonb_build_object('_legacy_log_id', p_log.id);

    RETURN v_event;
END;
$$;

CREATE OR REPLACE FUNCTION migration.fn_dual_write_logs_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event episodic_memory.events;
BEGIN
    v_event := migration.fn_transform_log_to_event(NEW);

    INSERT INTO episodic_memory.events (
        id, created_at, severity, category, event_type,
        summary, details, actor_id, actor_type, session_id,
        source_system, correlation_id
    ) VALUES (
        v_event.id, v_event.created_at, v_event.severity, v_event.category, v_event.event_type,
        v_event.summary, v_event.details, v_event.actor_id, v_event.actor_type, v_event.session_id,
        v_event.source_system, v_event.correlation_id
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO migration.migration_log (migration_name, level, message, details)
    VALUES ('logs_to_episodic_events', 'ERROR', 'Dual-write failed', jsonb_build_object(
        'error', SQLERRM,
        'log_id', NEW.id
    ));
    RETURN NEW;  -- Don't block source write
END;
$$;

-- Enable dual-write trigger (uncomment when ready to start dual-write phase)
-- CREATE TRIGGER trg_dual_write_logs_events
--     AFTER INSERT ON public.logs
--     FOR EACH ROW
--     EXECUTE FUNCTION migration.fn_dual_write_logs_to_events();

-- Update migration phase to dual_write when trigger is enabled
-- UPDATE migration.migration_status
-- SET phase = 'dual_write',
--     phase_changed_at = NOW()
-- WHERE migration_name = 'logs_to_episodic_events';

CREATE OR REPLACE PROCEDURE migration.pr_backfill_logs_to_events(
    p_batch_size INT DEFAULT 1000,
    p_sleep_ms INT DEFAULT 100
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status migration.migration_status;
    v_last_id BIGINT := 0;
    v_batch_migrated INT;
    v_batch_failed INT;
    v_log RECORD;
    v_event episodic_memory.events;
BEGIN
    -- Get current status
    SELECT * INTO v_status FROM migration.migration_status
    WHERE migration_name = 'logs_to_episodic_events';

    -- Resume from last migrated ID if present
    IF v_status.last_migrated_id IS NOT NULL THEN
        v_last_id := v_status.last_migrated_id::BIGINT;
    END IF;

    UPDATE migration.migration_status
    SET phase = 'backfilling',
        phase_changed_at = NOW()
    WHERE migration_name = 'logs_to_episodic_events';

    -- Process in batches (uncomment when public.logs exists)
    -- LOOP
    --     v_batch_migrated := 0;
    --     v_batch_failed := 0;
    --
    --     FOR v_log IN
    --         SELECT * FROM public.logs
    --         WHERE id > v_last_id
    --         ORDER BY id
    --         LIMIT p_batch_size
    --     LOOP
    --         BEGIN
    --             v_event := migration.fn_transform_log_to_event(v_log);
    --
    --             INSERT INTO episodic_memory.events (
    --                 id, created_at, severity, category, event_type,
    --                 summary, details, actor_id, actor_type, session_id,
    --                 source_system, correlation_id
    --             ) VALUES (
    --                 v_event.id, v_event.created_at, v_event.severity, v_event.category, v_event.event_type,
    --                 v_event.summary, v_event.details, v_event.actor_id, v_event.actor_type, v_event.session_id,
    --                 v_event.source_system, v_event.correlation_id
    --             );
    --
    --             v_batch_migrated := v_batch_migrated + 1;
    --             v_last_id := v_log.id;
    --
    --         EXCEPTION WHEN OTHERS THEN
    --             v_batch_failed := v_batch_failed + 1;
    --             INSERT INTO migration.migration_log (migration_name, level, message, details)
    --             VALUES ('logs_to_episodic_events', 'ERROR', 'Backfill row failed', jsonb_build_object(
    --                 'error', SQLERRM,
    --                 'log_id', v_log.id
    --             ));
    --             v_last_id := v_log.id;
    --         END;
    --     END LOOP;
    --
    --     -- Exit if no more rows
    --     EXIT WHEN v_batch_migrated = 0 AND v_batch_failed = 0;
    --
    --     -- Update progress
    --     UPDATE migration.migration_status
    --     SET migrated_rows = migrated_rows + v_batch_migrated,
    --         failed_rows = failed_rows + v_batch_failed,
    --         last_migrated_id = v_last_id::TEXT,
    --         phase_changed_at = NOW()
    --     WHERE migration_name = 'logs_to_episodic_events';
    --
    --     COMMIT;
    --
    --     -- Throttle
    --     PERFORM pg_sleep(p_sleep_ms / 1000.0);
    --
    --     RAISE NOTICE 'Backfill progress: migrated %, failed %, last_id %',
    --         v_batch_migrated, v_batch_failed, v_last_id;
    -- END LOOP;

    -- Mark backfill complete
    UPDATE migration.migration_status
    SET phase = 'backfilling_complete',
        phase_changed_at = NOW()
    WHERE migration_name = 'logs_to_episodic_events';
END;
$$;