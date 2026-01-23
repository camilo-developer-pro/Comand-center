-- ============================================================
-- Phase 3.2: Real-time Notification Channels
-- ============================================================

-- ============================================================
-- SECTION 1: Notification Helper Function
-- ============================================================

CREATE OR REPLACE FUNCTION notify_realtime(
    p_channel TEXT,
    p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM pg_notify(p_channel, p_payload::TEXT);
END;
$$;

-- ============================================================
-- SECTION 2: Entity Change Notifications
-- ============================================================

-- Generic entity change notifier
CREATE OR REPLACE FUNCTION notify_entity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSONB;
    v_entity_id UUID;
    v_workspace_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
        v_workspace_id := OLD.workspace_id;
    ELSE
        v_entity_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
    END IF;

    v_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'entity_id', v_entity_id,
        'workspace_id', v_workspace_id,
        'timestamp', extract(epoch from now())
    );

    -- Add changed fields for UPDATE
    IF TG_OP = 'UPDATE' THEN
        v_payload := v_payload || jsonb_build_object(
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(to_jsonb(NEW))
                WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key
            )
        );
    END IF;

    PERFORM pg_notify('entity_changed', v_payload::TEXT);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply to semantic_memory entities
DROP TRIGGER IF EXISTS trg_notify_entity_change ON semantic_memory.entities;
CREATE TRIGGER trg_notify_entity_change
    AFTER INSERT OR UPDATE OR DELETE ON semantic_memory.entities
    FOR EACH ROW
    EXECUTE FUNCTION notify_entity_change();

-- ============================================================
-- SECTION 3: Protocol Execution Notifications
-- ============================================================

CREATE OR REPLACE FUNCTION notify_execution_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM pg_notify('execution_status', jsonb_build_object(
            'execution_id', NEW.id,
            'protocol_id', NEW.protocol_id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'timestamp', extract(epoch from now())
        )::TEXT);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_execution_status ON procedural_memory.protocol_executions;
CREATE TRIGGER trg_notify_execution_status
    AFTER UPDATE ON procedural_memory.protocol_executions
    FOR EACH ROW
    EXECUTE FUNCTION notify_execution_status();

-- ============================================================
-- SECTION 4: Graph Edge Notifications (for Neural Graph)
-- ============================================================

CREATE OR REPLACE FUNCTION notify_graph_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_payload := jsonb_build_object(
            'operation', 'EDGE_ADDED',
            'source_id', NEW.source_entity_id,
            'target_id', NEW.target_entity_id,
            'edge_type', NEW.relationship_type,
            'timestamp', extract(epoch from now())
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_payload := jsonb_build_object(
            'operation', 'EDGE_REMOVED',
            'source_id', OLD.source_entity_id,
            'target_id', OLD.target_entity_id,
            'edge_type', OLD.relationship_type,
            'timestamp', extract(epoch from now())
        );
    END IF;

    PERFORM pg_notify('graph_changed', v_payload::TEXT);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_graph_change ON semantic_memory.entity_relationships;
CREATE TRIGGER trg_notify_graph_change
    AFTER INSERT OR DELETE ON semantic_memory.entity_relationships
    FOR EACH ROW
    EXECUTE FUNCTION notify_graph_change();

-- ============================================================
-- SECTION 5: Channel Documentation
-- ============================================================

COMMENT ON FUNCTION notify_realtime(TEXT, JSONB) IS
'Generic notification emitter. Channels:
- dashboard_delta: Item count changes (folders, documents)
- stats_updated: Dashboard stats version bump
- entity_changed: Entity CRUD operations with workspace_id and changed_fields
- execution_status: Protocol execution status changes (no workspace_id)
- graph_changed: Knowledge graph edge changes (no workspace_id)
- error_logged: New error in episodic_memory
- protocol_patched: Meta-Agent patched a protocol';