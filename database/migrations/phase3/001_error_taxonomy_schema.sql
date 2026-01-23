-- File: database/migrations/phase3/001_error_taxonomy_schema.sql
-- Phase 3: Error Taxonomy Schema for Autonomous Self-Repair

-- Error Classification Enum
CREATE TYPE episodic_memory.error_class AS ENUM (
    'TOOL_SCHEMA_MISMATCH',      -- Tool output doesn't match expected schema
    'TOOL_EXECUTION_FAILURE',    -- Tool threw an exception
    'LLM_PARSE_ERROR',           -- LLM response couldn't be parsed as JSON
    'LLM_HALLUCINATION',         -- LLM output failed validation against protocol constraints
    'CONTEXT_HYDRATION_FAILURE', -- Scaffold source fetch failed
    'TRANSITION_INVALID',        -- State machine reached undefined transition
    'TIMEOUT_EXCEEDED',          -- Step exceeded max_execution_time
    'PERMISSION_DENIED',         -- RLS or auth failure
    'RESOURCE_EXHAUSTED',        -- Rate limit, token limit, or quota exceeded
    'UNKNOWN'                    -- Unclassified error for Meta-Agent analysis
);

-- Error Log Table (linked to protocol_executions)
CREATE TABLE episodic_memory.error_logs (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Linkage
    execution_id UUID NOT NULL REFERENCES procedural_memory.protocol_executions(id),
    step_id TEXT NOT NULL,
    protocol_id UUID NOT NULL,
    protocol_version INT NOT NULL,

    -- Classification
    error_class episodic_memory.error_class NOT NULL,
    error_code TEXT,  -- e.g., 'TOOL_001', 'LLM_PARSE_003'

    -- Diagnostic Payload
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    step_input JSONB,      -- Input context at time of failure
    step_output JSONB,     -- Partial output (if any)
    expected_schema JSONB, -- What the step expected
    actual_output JSONB,   -- What was actually returned

    -- Meta-Agent Fields
    diagnosed_at TIMESTAMPTZ,
    diagnosis JSONB,       -- { root_cause, hypothesis, suggested_fix }
    patched_at TIMESTAMPTZ,
    patch_version INT,     -- Protocol version after patch

    -- Pattern Detection
    fingerprint TEXT
);

-- Trigger to compute fingerprint
CREATE OR REPLACE FUNCTION episodic_memory.fn_compute_error_fingerprint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $trigger$
BEGIN
    NEW.fingerprint := md5(NEW.error_class::TEXT || ':' || COALESCE(NEW.error_code, '') || ':' || NEW.step_id);
    RETURN NEW;
END;
$trigger$;

CREATE TRIGGER trg_compute_error_fingerprint
    BEFORE INSERT ON episodic_memory.error_logs
    FOR EACH ROW
    EXECUTE FUNCTION episodic_memory.fn_compute_error_fingerprint();

-- Indexes for Meta-Agent queries
CREATE INDEX idx_error_logs_execution ON episodic_memory.error_logs(execution_id);
CREATE INDEX idx_error_logs_protocol ON episodic_memory.error_logs(protocol_id, protocol_version);
CREATE INDEX idx_error_logs_fingerprint ON episodic_memory.error_logs(fingerprint);
CREATE INDEX idx_error_logs_undiagnosed ON episodic_memory.error_logs(created_at)
    WHERE diagnosed_at IS NULL;
CREATE INDEX idx_error_logs_class ON episodic_memory.error_logs(error_class);

-- Error Pattern Aggregation View
CREATE VIEW episodic_memory.error_patterns AS
SELECT
    fingerprint,
    error_class,
    error_code,
    step_id,
    COUNT(*) AS occurrence_count,
    COUNT(*) FILTER (WHERE diagnosed_at IS NOT NULL) AS diagnosed_count,
    COUNT(*) FILTER (WHERE patched_at IS NOT NULL) AS patched_count,
    MAX(created_at) AS last_occurrence,
    array_agg(DISTINCT protocol_id) AS affected_protocols
FROM episodic_memory.error_logs
GROUP BY fingerprint, error_class, error_code, step_id;

-- Helper Function for Error Logging
CREATE OR REPLACE FUNCTION episodic_memory.log_error(
    p_execution_id UUID,
    p_step_id TEXT,
    p_protocol_id UUID,
    p_protocol_version INT,
    p_error_class episodic_memory.error_class,
    p_error_message TEXT,
    p_step_input JSONB DEFAULT NULL,
    p_step_output JSONB DEFAULT NULL,
    p_expected_schema JSONB DEFAULT NULL,
    p_actual_output JSONB DEFAULT NULL,
    p_stack_trace TEXT DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_id UUID;
BEGIN
    INSERT INTO episodic_memory.error_logs (
        execution_id, step_id, protocol_id, protocol_version,
        error_class, error_code, error_message,
        step_input, step_output, expected_schema, actual_output, stack_trace
    ) VALUES (
        p_execution_id, p_step_id, p_protocol_id, p_protocol_version,
        p_error_class, p_error_code, p_error_message,
        p_step_input, p_step_output, p_expected_schema, p_actual_output, p_stack_trace
    )
    RETURNING id INTO v_error_id;

    -- Emit notification for Meta-Agent
    PERFORM pg_notify('error_logged', json_build_object(
        'error_id', v_error_id,
        'error_class', p_error_class,
        'protocol_id', p_protocol_id,
        'step_id', p_step_id
    )::TEXT);

    RETURN v_error_id;
END;
$$;