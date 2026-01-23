-- File: database/migrations/phase3/002_diagnostic_engine.sql
-- Phase 3: Diagnostic Engine for Autonomous Error Analysis

-- Diagnosis Result Type
CREATE TYPE episodic_memory.diagnosis_result AS (
    root_cause TEXT,
    confidence FLOAT,
    hypothesis TEXT,
    suggested_fix JSONB,
    requires_human_review BOOLEAN,
    similar_errors UUID[]
);

-- Diagnostic Engine Function
CREATE OR REPLACE FUNCTION episodic_memory.diagnose_error(
    p_error_id UUID
)
RETURNS episodic_memory.diagnosis_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $diagnose$
DECLARE
    v_error RECORD;
    v_result episodic_memory.diagnosis_result;
    v_similar_count INT;
    v_pattern_history RECORD;
BEGIN
    -- Fetch error details
    SELECT * INTO v_error FROM episodic_memory.error_logs WHERE id = p_error_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Error not found: %', p_error_id;
    END IF;

    -- Check for similar historical errors (same fingerprint)
    SELECT
        COUNT(*) AS total_occurrences,
        COUNT(*) FILTER (WHERE patched_at IS NOT NULL) AS successful_patches,
        array_agg(id ORDER BY created_at DESC) FILTER (WHERE id != p_error_id) AS similar_ids
    INTO v_pattern_history
    FROM episodic_memory.error_logs
    WHERE fingerprint = v_error.fingerprint
      AND created_at > NOW() - INTERVAL '30 days';

    v_similar_count := COALESCE(v_pattern_history.total_occurrences, 0);

    -- Generate diagnosis based on error class
    CASE v_error.error_class
        WHEN 'TOOL_SCHEMA_MISMATCH' THEN
            v_result.root_cause := 'Tool output schema does not match protocol expectation';
            v_result.confidence := 0.9;
            v_result.hypothesis := format(
                'The tool "%s" returned output with schema: %s but expected: %s',
                v_error.step_id,
                jsonb_typeof(v_error.actual_output),
                v_error.expected_schema
            );
            v_result.suggested_fix := jsonb_build_object(
                'action', 'UPDATE_PROTOCOL_SCHEMA',
                'target', 'steps.' || v_error.step_id || '.config.output_schema',
                'new_value', v_error.actual_output
            );
            v_result.requires_human_review := FALSE;

        WHEN 'LLM_PARSE_ERROR' THEN
            v_result.root_cause := 'LLM response was not valid JSON';
            v_result.confidence := 0.85;
            v_result.hypothesis := 'The LLM prompt may not be enforcing JSON output format strictly';
            v_result.suggested_fix := jsonb_build_object(
                'action', 'UPDATE_PROMPT_TEMPLATE',
                'target', 'steps.' || v_error.step_id || '.config.system_prompt',
                'append', E'\n\nCRITICAL: You MUST respond with valid JSON only. No explanations or markdown.'
            );
            v_result.requires_human_review := FALSE;

        WHEN 'CONTEXT_HYDRATION_FAILURE' THEN
            v_result.root_cause := 'Scaffold source fetch failed';
            v_result.confidence := 0.7;
            v_result.hypothesis := format(
                'The scaffold source may have incorrect parameters or the data does not exist. Input: %s',
                v_error.step_input
            );
            v_result.suggested_fix := jsonb_build_object(
                'action', 'ADD_FALLBACK_SOURCE',
                'target', 'scaffold.context_sources',
                'recommendation', 'Add optional: true to the failing source'
            );
            v_result.requires_human_review := TRUE;

        WHEN 'TIMEOUT_EXCEEDED' THEN
            v_result.root_cause := 'Step execution exceeded time limit';
            v_result.confidence := 0.95;
            v_result.hypothesis := format(
                'Step %s took longer than allowed. Consider increasing timeout or optimizing the operation.',
                v_error.step_id
            );
            v_result.suggested_fix := jsonb_build_object(
                'action', 'INCREASE_TIMEOUT',
                'target', 'steps.' || v_error.step_id || '.timeout_ms',
                'current_value', (v_error.step_input->>'timeout_ms')::INT,
                'suggested_value', COALESCE((v_error.step_input->>'timeout_ms')::INT, 30000) * 2
            );
            v_result.requires_human_review := FALSE;

        WHEN 'TRANSITION_INVALID' THEN
            v_result.root_cause := 'State machine reached undefined transition';
            v_result.confidence := 0.92;
            v_result.hypothesis := 'The protocol transitions map is missing an edge case';
            v_result.suggested_fix := jsonb_build_object(
                'action', 'ADD_TRANSITION',
                'target', 'transitions.' || v_error.step_id,
                'recommendation', 'Add fallback transition to error handler'
            );
            v_result.requires_human_review := TRUE;

        ELSE
            v_result.root_cause := 'Unknown error - requires manual investigation';
            v_result.confidence := 0.3;
            v_result.hypothesis := v_error.error_message;
            v_result.suggested_fix := jsonb_build_object(
                'action', 'MANUAL_REVIEW',
                'error_context', v_error.step_input
            );
            v_result.requires_human_review := TRUE;
    END CASE;

    -- Adjust confidence based on historical patterns
    IF v_similar_count > 5 AND v_pattern_history.successful_patches > 0 THEN
        v_result.confidence := LEAST(v_result.confidence + 0.1, 1.0);
    END IF;

    v_result.similar_errors := v_pattern_history.similar_ids;

    -- Update the error record with diagnosis
    UPDATE episodic_memory.error_logs
    SET
        diagnosed_at = NOW(),
        diagnosis = jsonb_build_object(
            'root_cause', v_result.root_cause,
            'confidence', v_result.confidence,
            'hypothesis', v_result.hypothesis,
            'suggested_fix', v_result.suggested_fix,
            'requires_human_review', v_result.requires_human_review,
            'similar_errors_count', v_similar_count
        )
    WHERE id = p_error_id;

    RETURN v_result;
END;
$diagnose$;

-- Batch Diagnosis Function (for processing undiagnosed errors)
CREATE OR REPLACE FUNCTION episodic_memory.diagnose_pending_errors(
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    error_id UUID,
    diagnosis episodic_memory.diagnosis_result
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $batch$
DECLARE
    v_error_id UUID;
BEGIN
    FOR v_error_id IN
        SELECT id FROM episodic_memory.error_logs
        WHERE diagnosed_at IS NULL
        ORDER BY created_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    LOOP
        RETURN QUERY SELECT v_error_id, episodic_memory.diagnose_error(v_error_id);
    END LOOP;
END;
$batch$;