-- File: migrations/phase1/007c_session_trigger.sql

-- ============================================================
-- SESSION UPDATE TRIGGER FOR EVENTS
-- ============================================================

-- This trigger updates session metrics when events are inserted
-- Note: In partitioned tables, triggers must be created on the parent
-- and PostgreSQL will automatically fire them for partition inserts

CREATE OR REPLACE FUNCTION episodic_memory.fn_update_session_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $trigger$
BEGIN
    IF NEW.session_id IS NOT NULL THEN
        UPDATE episodic_memory.sessions
        SET event_count = event_count + 1,
            last_event_at = NEW.created_at
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$trigger$;

-- Create trigger on parent table (fires for all partitions)
DROP TRIGGER IF EXISTS trg_update_session_on_event ON episodic_memory.events;

CREATE TRIGGER trg_update_session_on_event
    AFTER INSERT ON episodic_memory.events
    FOR EACH ROW
    EXECUTE FUNCTION episodic_memory.fn_update_session_on_event();