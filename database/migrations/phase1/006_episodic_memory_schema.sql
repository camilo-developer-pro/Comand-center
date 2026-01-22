-- File: migrations/006_episodic_memory_schema.sql

-- Event severity levels
CREATE TYPE episodic_memory.event_severity AS ENUM (
    'DEBUG', 'INFO', 'NOTICE', 'WARNING', 'ERROR', 'CRITICAL'
);

-- Event categories
CREATE TYPE episodic_memory.event_category AS ENUM (
    'SYSTEM', 'USER_ACTION', 'AGENT_ACTION', 'INTEGRATION',
    'SECURITY', 'PERFORMANCE', 'DATA_CHANGE'
);

CREATE TABLE episodic_memory.events (
    id UUID NOT NULL DEFAULT generate_uuidv7(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Event classification
    severity episodic_memory.event_severity NOT NULL DEFAULT 'INFO',
    category episodic_memory.event_category NOT NULL,
    event_type TEXT NOT NULL,

    -- Context
    session_id UUID,
    actor_id UUID,
    actor_type TEXT, -- 'user', 'agent', 'system'

    -- Payload
    summary TEXT NOT NULL,
    details JSONB DEFAULT '{}',

    -- Metadata
    source_system TEXT,
    correlation_id UUID,

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create indexes on parent (inherited by partitions)
CREATE INDEX idx_events_session_created ON episodic_memory.events (session_id, created_at DESC);
CREATE INDEX idx_events_category_type ON episodic_memory.events (category, event_type);
CREATE INDEX idx_events_actor ON episodic_memory.events (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_events_correlation ON episodic_memory.events (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_events_details_gin ON episodic_memory.events USING GIN (details jsonb_path_ops);

COMMENT ON TABLE episodic_memory.events IS 'Time-series event log. Partitioned monthly by created_at. Managed by pg_partman.';

CREATE TABLE episodic_memory.sessions (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,

    -- Session identification
    session_type TEXT NOT NULL, -- 'user_chat', 'agent_task', 'api_request'

    -- Participants
    user_id UUID,
    agent_id UUID,

    -- State
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'error')),

    -- Context
    context JSONB DEFAULT '{}',
    summary TEXT,

    -- Metrics
    event_count INT DEFAULT 0,
    last_event_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user_created ON episodic_memory.sessions (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sessions_agent_created ON episodic_memory.sessions (agent_id, created_at DESC) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_sessions_status ON episodic_memory.sessions (status) WHERE status = 'active';

COMMENT ON TABLE episodic_memory.sessions IS 'Session tracking for user and agent interactions. Links to events.';

CREATE OR REPLACE FUNCTION episodic_memory.fn_update_session_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn_update$
BEGIN
    IF NEW.session_id IS NOT NULL THEN
        UPDATE episodic_memory.sessions
        SET event_count = event_count + 1,
            last_event_at = NEW.created_at
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$fn_update$;