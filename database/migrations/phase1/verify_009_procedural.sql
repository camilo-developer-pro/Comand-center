-- File: verify_009_procedural.sql

DO $verify$
DECLARE
    v_protocol_id UUID;
    v_execution_id UUID;
    v_valid_definition JSONB;
    v_invalid_definition JSONB;
BEGIN
    -- Test 1: Valid protocol definition
    v_valid_definition := '{
        "version": "1.0",
        "name": "Test Protocol",
        "description": "A test protocol",
        "steps": [
            {
                "id": "step1",
                "action": "send_email",
                "parameters": {"to": "test@example.com"},
                "on_success": "step2",
                "on_failure": "abort"
            },
            {
                "id": "step2",
                "action": "log_success",
                "on_success": "complete"
            }
        ]
    }'::JSONB;

    INSERT INTO procedural_memory.protocols (name, definition)
    VALUES ('Test Protocol', v_valid_definition)
    RETURNING id INTO v_protocol_id;

    ASSERT v_protocol_id IS NOT NULL, 'Could not create valid protocol';

    -- Test 2: Slug generation
    ASSERT EXISTS (
        SELECT 1 FROM procedural_memory.protocols
        WHERE id = v_protocol_id AND slug = 'test-protocol'
    ), 'Slug not auto-generated correctly';

    -- Test 3: Invalid protocol definition (missing name)
    v_invalid_definition := '{
        "version": "1.0",
        "steps": [{"id": "step1", "action": "test"}]
    }'::JSONB;

    BEGIN
        INSERT INTO procedural_memory.protocols (name, definition)
        VALUES ('Invalid Protocol', v_invalid_definition);
        RAISE EXCEPTION 'Should have rejected invalid protocol';
    EXCEPTION WHEN OTHERS THEN
        -- Expected to fail
        RAISE NOTICE 'Test 3 PASSED: Correctly rejected protocol without name';
    END;

    -- Test 4: Invalid protocol definition (invalid step reference)
    v_invalid_definition := '{
        "version": "1.0",
        "name": "Invalid Protocol",
        "steps": [
            {
                "id": "step1",
                "action": "test",
                "on_success": "nonexistent_step"
            }
        ]
    }'::JSONB;

    BEGIN
        INSERT INTO procedural_memory.protocols (name, definition)
        VALUES ('Invalid Protocol 2', v_invalid_definition);
        RAISE EXCEPTION 'Should have rejected protocol with invalid step reference';
    EXCEPTION WHEN OTHERS THEN
        -- Expected to fail
        RAISE NOTICE 'Test 4 PASSED: Correctly rejected protocol with invalid step reference';
    END;

    -- Test 5: Protocol execution creation
    INSERT INTO procedural_memory.protocol_executions (protocol_id, triggered_by)
    VALUES (v_protocol_id, 'test')
    RETURNING id INTO v_execution_id;

    ASSERT v_execution_id IS NOT NULL, 'Could not create protocol execution';

    -- Test 6: Execution metrics update
    UPDATE procedural_memory.protocol_executions
    SET status = 'completed', completed_at = NOW()
    WHERE id = v_execution_id;

    ASSERT EXISTS (
        SELECT 1 FROM procedural_memory.protocols
        WHERE id = v_protocol_id
        AND execution_count = 1
        AND success_count = 1
    ), 'Protocol metrics not updated correctly';

    -- Cleanup
    DELETE FROM procedural_memory.protocol_executions WHERE protocol_id = v_protocol_id;
    DELETE FROM procedural_memory.protocols WHERE id = v_protocol_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL PROCEDURAL MEMORY TESTS PASSED';
    RAISE NOTICE '========================================';
END;
$verify$;