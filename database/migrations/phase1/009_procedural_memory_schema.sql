-- File: migrations/009_procedural_memory_schema.sql

CREATE TYPE procedural_memory.protocol_status AS ENUM (
    'draft',       -- Being developed
    'testing',     -- In validation
    'active',      -- Production ready
    'deprecated',  -- Replaced by newer version
    'archived'     -- No longer in use
);

CREATE TYPE procedural_memory.execution_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'timeout'
);

CREATE OR REPLACE FUNCTION procedural_memory.fn_validate_protocol_definition(p_definition JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_step JSONB;
    v_step_ids TEXT[];
    v_step_id TEXT;
    v_ref TEXT;
    v_input JSONB;
    v_valid_types TEXT[] := ARRAY['string', 'number', 'boolean', 'object', 'array'];
    v_valid_keywords TEXT[] := ARRAY['complete', 'abort', 'retry'];
BEGIN
    -- Check required top-level fields
    IF p_definition IS NULL THEN
        RAISE EXCEPTION 'Protocol definition cannot be NULL';
    END IF;

    IF NOT (p_definition ? 'version') THEN
        RAISE EXCEPTION 'Protocol definition must have "version" field';
    END IF;

    IF NOT (p_definition ? 'name') OR (p_definition->>'name') IS NULL OR trim(p_definition->>'name') = '' THEN
        RAISE EXCEPTION 'Protocol definition must have non-empty "name" field';
    END IF;

    -- Validate steps array
    IF NOT (p_definition ? 'steps') OR jsonb_array_length(p_definition->'steps') = 0 THEN
        RAISE EXCEPTION 'Protocol definition must have at least one step in "steps" array';
    END IF;

    -- Collect step IDs and validate each step
    v_step_ids := ARRAY[]::TEXT[];
    FOR v_step IN SELECT jsonb_array_elements(p_definition->'steps') LOOP
        -- Check required step fields
        IF NOT (v_step ? 'id') OR (v_step->>'id') IS NULL THEN
            RAISE EXCEPTION 'Each step must have an "id" field';
        END IF;

        IF NOT (v_step ? 'action') OR (v_step->>'action') IS NULL THEN
            RAISE EXCEPTION 'Step "%" must have an "action" field', v_step->>'id';
        END IF;

        v_step_id := v_step->>'id';

        -- Check for duplicate step IDs
        IF v_step_id = ANY(v_step_ids) THEN
            RAISE EXCEPTION 'Duplicate step ID: "%"', v_step_id;
        END IF;

        v_step_ids := array_append(v_step_ids, v_step_id);
    END LOOP;

    -- Validate step references (on_success, on_failure)
    FOR v_step IN SELECT jsonb_array_elements(p_definition->'steps') LOOP
        -- Validate on_success reference
        IF v_step ? 'on_success' THEN
            v_ref := v_step->>'on_success';
            IF NOT (v_ref = ANY(v_step_ids) OR v_ref = ANY(v_valid_keywords)) THEN
                RAISE EXCEPTION 'Step "%": invalid on_success reference "%"', v_step->>'id', v_ref;
            END IF;
        END IF;

        -- Validate on_failure reference
        IF v_step ? 'on_failure' THEN
            v_ref := v_step->>'on_failure';
            IF NOT (v_ref = ANY(v_step_ids) OR v_ref = ANY(v_valid_keywords)) THEN
                RAISE EXCEPTION 'Step "%": invalid on_failure reference "%"', v_step->>'id', v_ref;
            END IF;
        END IF;

        -- Validate timeout is positive if present
        IF v_step ? 'timeout_seconds' THEN
            IF (v_step->>'timeout_seconds')::NUMERIC <= 0 THEN
                RAISE EXCEPTION 'Step "%": timeout_seconds must be positive', v_step->>'id';
            END IF;
        END IF;
    END LOOP;

    -- Validate inputs array if present
    IF p_definition ? 'inputs' THEN
        FOR v_input IN SELECT jsonb_array_elements(p_definition->'inputs') LOOP
            IF NOT (v_input ? 'name') OR (v_input->>'name') IS NULL THEN
                RAISE EXCEPTION 'Each input must have a "name" field';
            END IF;

            IF v_input ? 'type' AND NOT (v_input->>'type' = ANY(v_valid_types)) THEN
                RAISE EXCEPTION 'Input "%": invalid type "%"', v_input->>'name', v_input->>'type';
            END IF;
        END LOOP;
    END IF;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION procedural_memory.fn_validate_protocol_definition(JSONB) IS
'Validates protocol definition JSONB structure. Ensures required fields, valid step references, and type consistency.';

CREATE TABLE procedural_memory.protocols (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Identification
    name TEXT NOT NULL,
    slug TEXT NOT NULL,  -- URL-safe identifier
    version TEXT NOT NULL DEFAULT '1.0.0',

    -- Content
    description TEXT,
    definition JSONB NOT NULL,

    -- Classification
    category TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Ordering (fractional indexing)
    rank_key TEXT,

    -- Status
    status procedural_memory.protocol_status NOT NULL DEFAULT 'draft',

    -- Ownership
    owner_id UUID,

    -- Metrics
    execution_count BIGINT DEFAULT 0,
    success_count BIGINT DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    avg_execution_time_ms NUMERIC,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT uq_protocol_slug_version UNIQUE (slug, version),
    CONSTRAINT uq_protocol_category_rank UNIQUE (category, rank_key)
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT chk_protocol_definition CHECK (
        procedural_memory.fn_validate_protocol_definition(definition)
    )
);

-- Indexes
CREATE INDEX idx_protocols_status ON procedural_memory.protocols (status);
CREATE INDEX idx_protocols_category ON procedural_memory.protocols (category) WHERE category IS NOT NULL;
CREATE INDEX idx_protocols_tags ON procedural_memory.protocols USING GIN (tags);
CREATE INDEX idx_protocols_owner ON procedural_memory.protocols (owner_id) WHERE owner_id IS NOT NULL;

-- Full-text search on name and description
CREATE INDEX idx_protocols_search ON procedural_memory.protocols
    USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

COMMENT ON TABLE procedural_memory.protocols IS
'Workflow definitions with strict JSONB validation. Supports versioning, categorization, and execution metrics.';

CREATE OR REPLACE FUNCTION procedural_memory.fn_generate_slug(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                trim(p_name),
                '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
            ),
            '\s+', '-', 'g'  -- Replace spaces with hyphens
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION procedural_memory.fn_protocol_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Generate slug if not provided
    IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
        NEW.slug := procedural_memory.fn_generate_slug(NEW.name);
    END IF;

    -- Extract version from definition if present
    IF NEW.definition ? 'version' AND NEW.definition->>'version' IS NOT NULL THEN
        NEW.version := NEW.definition->>'version';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protocol_before_insert
    BEFORE INSERT ON procedural_memory.protocols
    FOR EACH ROW
    EXECUTE FUNCTION procedural_memory.fn_protocol_before_insert();

CREATE OR REPLACE FUNCTION procedural_memory.fn_protocol_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protocol_before_update
    BEFORE UPDATE ON procedural_memory.protocols
    FOR EACH ROW
    EXECUTE FUNCTION procedural_memory.fn_protocol_before_update();

CREATE TABLE procedural_memory.protocol_executions (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    protocol_id UUID NOT NULL REFERENCES procedural_memory.protocols(id),

    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    status procedural_memory.execution_status NOT NULL DEFAULT 'pending',

    -- Input/Output
    input_data JSONB DEFAULT '{}',
    output_data JSONB,

    -- Execution context
    triggered_by TEXT,  -- 'user', 'schedule', 'event', 'api'
    trigger_context JSONB DEFAULT '{}',

    -- Error handling
    error_message TEXT,
    error_step_id TEXT,
    retry_count INT DEFAULT 0,

    -- Session linking
    session_id UUID,

    -- Step execution log
    step_log JSONB DEFAULT '[]'
);

CREATE INDEX idx_executions_protocol ON procedural_memory.protocol_executions (protocol_id, started_at DESC);
CREATE INDEX idx_executions_status ON procedural_memory.protocol_executions (status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_executions_session ON procedural_memory.protocol_executions (session_id) WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION procedural_memory.fn_update_protocol_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_execution_time_ms NUMERIC;
BEGIN
    -- Only update on completion
    IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') THEN
        v_execution_time_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;

        UPDATE procedural_memory.protocols
        SET execution_count = execution_count + 1,
            success_count = CASE WHEN NEW.status = 'completed' THEN success_count + 1 ELSE success_count END,
            last_executed_at = NEW.completed_at,
            avg_execution_time_ms = CASE
                WHEN avg_execution_time_ms IS NULL THEN v_execution_time_ms
                ELSE (avg_execution_time_ms * (execution_count - 1) + v_execution_time_ms) / execution_count
            END
        WHERE id = NEW.protocol_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_execution_metrics
    AFTER UPDATE ON procedural_memory.protocol_executions
    FOR EACH ROW
    EXECUTE FUNCTION procedural_memory.fn_update_protocol_metrics();