-- Command Center V3.0 - Phase 1 Complete Verification Suite
-- Tests all critical components: schemas, extensions, UUIDv7, fractional indexing, protocols

-- =============================================================================
-- 1. TEST FRAMEWORK SETUP
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS test;

CREATE TABLE test.test_results (
    id SERIAL PRIMARY KEY,
    run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    test_suite TEXT NOT NULL,
    test_name TEXT NOT NULL,
    passed BOOLEAN NOT NULL,
    message TEXT,
    execution_time_ms INT
);

CREATE OR REPLACE FUNCTION test.fn_assert(
    p_condition BOOLEAN,
    p_test_name TEXT,
    p_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_condition THEN
        RAISE NOTICE 'PASS: %', p_test_name;
    ELSE
        RAISE WARNING 'FAIL: % - %', p_test_name, COALESCE(p_message, 'Assertion failed');
    END IF;
    RETURN p_condition;
END;
$$;

-- =============================================================================
-- 2. SCHEMA VERIFICATION TESTS
-- =============================================================================

CREATE OR REPLACE FUNCTION test.fn_verify_schemas()
RETURNS SETOF test.test_results
LANGUAGE plpgsql
AS $$
DECLARE
    v_result test.test_results;
    v_start TIMESTAMP;
BEGIN
    v_result.test_suite := 'schema_verification';
    v_result.run_at := NOW();

    -- Test: Episodic memory schema exists
    v_start := clock_timestamp();
    v_result.test_name := 'episodic_memory_schema_exists';
    v_result.passed := EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'episodic_memory');
    v_result.message := CASE WHEN v_result.passed THEN 'Schema exists' ELSE 'Schema not found' END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Semantic memory schema exists
    v_start := clock_timestamp();
    v_result.test_name := 'semantic_memory_schema_exists';
    v_result.passed := EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'semantic_memory');
    v_result.message := CASE WHEN v_result.passed THEN 'Schema exists' ELSE 'Schema not found' END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Procedural memory schema exists
    v_start := clock_timestamp();
    v_result.test_name := 'procedural_memory_schema_exists';
    v_result.passed := EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'procedural_memory');
    v_result.message := CASE WHEN v_result.passed THEN 'Schema exists' ELSE 'Schema not found' END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Required extensions
    v_start := clock_timestamp();
    v_result.test_name := 'required_extensions_installed';
    v_result.passed := (
        SELECT COUNT(*) = 3 FROM pg_extension
        WHERE extname IN ('pgcrypto', 'pg_partman', 'vector')
    );
    v_result.message := CASE WHEN v_result.passed THEN 'All extensions installed' ELSE 'Missing extensions' END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;
END;
$$;

-- =============================================================================
-- 3. UUIDv7 VERIFICATION TESTS
-- =============================================================================

CREATE OR REPLACE FUNCTION test.fn_verify_uuidv7()
RETURNS SETOF test.test_results
LANGUAGE plpgsql
AS $$
DECLARE
    v_result test.test_results;
    v_start TIMESTAMP;
    v_uuid1 UUID;
    v_uuid2 UUID;
    v_ts TIMESTAMP WITH TIME ZONE;
BEGIN
    v_result.test_suite := 'uuidv7_verification';
    v_result.run_at := NOW();

    -- Test: Generate UUIDv7
    v_start := clock_timestamp();
    v_result.test_name := 'generate_uuidv7_works';
    BEGIN
        v_uuid1 := generate_uuidv7();
        v_result.passed := v_uuid1 IS NOT NULL;
        v_result.message := 'Generated: ' || v_uuid1::TEXT;
    EXCEPTION WHEN OTHERS THEN
        v_result.passed := FALSE;
        v_result.message := SQLERRM;
    END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: UUIDv7 ordering
    v_start := clock_timestamp();
    v_result.test_name := 'uuidv7_maintains_order';
    v_uuid1 := generate_uuidv7();
    PERFORM pg_sleep(0.01);
    v_uuid2 := generate_uuidv7();
    v_result.passed := v_uuid2 > v_uuid1;
    v_result.message := format('UUID1: %s, UUID2: %s, Ordered: %s', v_uuid1, v_uuid2, v_uuid2 > v_uuid1);
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Timestamp extraction
    v_start := clock_timestamp();
    v_result.test_name := 'uuidv7_timestamp_extraction';
    v_uuid1 := generate_uuidv7();
    v_ts := uuidv7_extract_timestamp(v_uuid1);
    v_result.passed := v_ts BETWEEN NOW() - INTERVAL '1 minute' AND NOW() + INTERVAL '1 minute';
    v_result.message := 'Extracted timestamp: ' || v_ts::TEXT;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;
END;
$$;

-- =============================================================================
-- 4. FRACTIONAL INDEXING VERIFICATION TESTS
-- =============================================================================

CREATE OR REPLACE FUNCTION test.fn_verify_fractional_indexing()
RETURNS SETOF test.test_results
LANGUAGE plpgsql
AS $$
DECLARE
    v_result test.test_results;
    v_start TIMESTAMP;
    v_key TEXT;
    v_key1 TEXT;
    v_key2 TEXT;
    v_keys TEXT[] := ARRAY[]::TEXT[];
    v_i INT;
BEGIN
    v_result.test_suite := 'fractional_indexing_verification';
    v_result.run_at := NOW();

    -- Test: Generate first key
    v_start := clock_timestamp();
    v_result.test_name := 'fi_generate_first_key';
    v_key := fi_generate_key_between(NULL, NULL);
    v_result.passed := v_key IS NOT NULL AND v_key != '';
    v_result.message := 'First key: ' || COALESCE(v_key, 'NULL');
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Generate between two keys
    v_start := clock_timestamp();
    v_result.test_name := 'fi_generate_between';
    v_key := fi_generate_key_between('a', 'c');
    v_result.passed := v_key > 'a' AND v_key < 'c';
    v_result.message := format('Between a and c: %s', v_key);
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Infinite space (adjacent keys)
    v_start := clock_timestamp();
    v_result.test_name := 'fi_infinite_space';
    v_key := fi_generate_key_between('a', 'b');
    v_result.passed := v_key > 'a' AND v_key < 'b' AND length(v_key) > 1;
    v_result.message := format('Between a and b: %s (length: %s)', v_key, length(v_key));
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: 50 sequential inserts maintain order
    v_start := clock_timestamp();
    v_result.test_name := 'fi_sequential_inserts_ordered';
    v_keys := ARRAY[fi_generate_key_between(NULL, NULL)];
    FOR v_i IN 1..50 LOOP
        v_key := fi_generate_key_between(v_keys[array_length(v_keys, 1)], NULL);
        IF v_key <= v_keys[array_length(v_keys, 1)] THEN
            v_result.passed := FALSE;
            v_result.message := format('Order violation at iteration %s', v_i);
            v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
            RETURN NEXT v_result;
            RETURN;
        END IF;
        v_keys := array_append(v_keys, v_key);
    END LOOP;
    v_result.passed := TRUE;
    v_result.message := '50 sequential inserts maintain order';
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;
END;
$$;

-- =============================================================================
-- 5. PROTOCOL VALIDATION TESTS
-- =============================================================================

CREATE OR REPLACE FUNCTION test.fn_verify_protocol_validation()
RETURNS SETOF test.test_results
LANGUAGE plpgsql
AS $$
DECLARE
    v_result test.test_results;
    v_start TIMESTAMP;
    v_valid_protocol JSONB;
    v_invalid_protocol JSONB;
    v_protocol_id UUID;
BEGIN
    v_result.test_suite := 'protocol_validation_verification';
    v_result.run_at := NOW();

    -- Valid protocol definition
    v_valid_protocol := '{
        "version": "1.0",
        "name": "Test Protocol",
        "description": "A test workflow",
        "steps": [
            {"id": "step1", "action": "notify", "on_success": "step2", "on_failure": "abort"},
            {"id": "step2", "action": "complete", "on_success": "complete"}
        ],
        "inputs": [{"name": "message", "type": "string", "required": true}]
    }'::JSONB;

    -- Test: Valid protocol accepted
    v_start := clock_timestamp();
    v_result.test_name := 'valid_protocol_accepted';
    BEGIN
        INSERT INTO procedural_memory.protocols (name, definition)
        VALUES ('Test Protocol', v_valid_protocol)
        RETURNING id INTO v_protocol_id;
        v_result.passed := v_protocol_id IS NOT NULL;
        v_result.message := 'Protocol created: ' || v_protocol_id::TEXT;
        -- Cleanup
        DELETE FROM procedural_memory.protocols WHERE id = v_protocol_id;
    EXCEPTION WHEN OTHERS THEN
        v_result.passed := FALSE;
        v_result.message := SQLERRM;
    END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Invalid protocol (no steps) rejected
    v_start := clock_timestamp();
    v_result.test_name := 'invalid_protocol_no_steps_rejected';
    v_invalid_protocol := '{"version": "1.0", "name": "Bad Protocol", "steps": []}'::JSONB;
    BEGIN
        INSERT INTO procedural_memory.protocols (name, definition)
        VALUES ('Bad Protocol', v_invalid_protocol);
        v_result.passed := FALSE;
        v_result.message := 'Should have rejected protocol with empty steps';
    EXCEPTION WHEN OTHERS THEN
        v_result.passed := TRUE;
        v_result.message := 'Correctly rejected: ' || SQLERRM;
    END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;

    -- Test: Invalid step reference rejected
    v_start := clock_timestamp();
    v_result.test_name := 'invalid_step_reference_rejected';
    v_invalid_protocol := '{
        "version": "1.0",
        "name": "Bad Protocol",
        "steps": [{"id": "step1", "action": "test", "on_success": "nonexistent"}]
    }'::JSONB;
    BEGIN
        INSERT INTO procedural_memory.protocols (name, definition)
        VALUES ('Bad Protocol', v_invalid_protocol);
        v_result.passed := FALSE;
        v_result.message := 'Should have rejected invalid step reference';
    EXCEPTION WHEN OTHERS THEN
        v_result.passed := TRUE;
        v_result.message := 'Correctly rejected: ' || SQLERRM;
    END;
    v_result.execution_time_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INT;
    RETURN NEXT v_result;
END;
$$;

-- =============================================================================
-- 6. RUN ALL TESTS
-- =============================================================================

-- Execute verification tests directly
DELETE FROM test.test_results WHERE run_at > NOW() - INTERVAL '1 hour';

-- Run all test suites (specify columns to avoid id conflict)
INSERT INTO test.test_results (run_at, test_suite, test_name, passed, message, execution_time_ms)
SELECT run_at, test_suite, test_name, passed, message, execution_time_ms FROM test.fn_verify_schemas();

INSERT INTO test.test_results (run_at, test_suite, test_name, passed, message, execution_time_ms)
SELECT run_at, test_suite, test_name, passed, message, execution_time_ms FROM test.fn_verify_uuidv7();

INSERT INTO test.test_results (run_at, test_suite, test_name, passed, message, execution_time_ms)
SELECT run_at, test_suite, test_name, passed, message, execution_time_ms FROM test.fn_verify_fractional_indexing();

INSERT INTO test.test_results (run_at, test_suite, test_name, passed, message, execution_time_ms)
SELECT run_at, test_suite, test_name, passed, message, execution_time_ms FROM test.fn_verify_protocol_validation();

-- Show test suite summary
SELECT
    test_suite,
    COUNT(*)::INT AS total_tests,
    COUNT(*) FILTER (WHERE passed)::INT AS passed,
    COUNT(*) FILTER (WHERE NOT passed)::INT AS failed,
    ROUND(COUNT(*) FILTER (WHERE passed)::NUMERIC / COUNT(*) * 100, 2) AS pass_rate
FROM test.test_results
WHERE run_at > NOW() - INTERVAL '1 hour'
GROUP BY test_suite
ORDER BY test_suite;

-- Show all detailed results
SELECT test_suite, test_name, passed, message, execution_time_ms
FROM test.test_results
WHERE run_at > NOW() - INTERVAL '1 hour'
ORDER BY test_suite, test_name;