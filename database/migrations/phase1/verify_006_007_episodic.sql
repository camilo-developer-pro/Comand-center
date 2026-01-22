-- File: verify_006_007_episodic.sql

-- Verify episodic memory schema and native partitioning setup

DO $verify$
DECLARE
    v_partition_count INT;
    v_config_count INT;
    v_session_id UUID;
    v_event_count_before INT;
    v_event_count_after INT;
    v_test_id UUID;
BEGIN
    -- Test 1: Check types exist
    RAISE NOTICE 'Checking types...';
    ASSERT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'episodic_memory'
        AND t.typname = 'event_severity'
    ), 'event_severity type missing';

    ASSERT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'episodic_memory'
        AND t.typname = 'event_category'
    ), 'event_category type missing';

    -- Test 2: Check partition management config
    RAISE NOTICE 'Checking partition management config...';
    SELECT COUNT(*) INTO v_config_count
    FROM partition_mgmt.partition_config
    WHERE parent_schema = 'episodic_memory' AND parent_table = 'events';

    ASSERT v_config_count = 1, 'Partition config not found';

    -- Test 3: Check native partitions exist
    RAISE NOTICE 'Checking events table native partitioning...';
    SELECT COUNT(*) INTO v_partition_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class parent ON parent.oid = i.inhparent
    WHERE n.nspname = 'episodic_memory'
    AND parent.relname = 'events';

    ASSERT v_partition_count >= 4, 'Expected at least 4 partitions (current + 3 future)';

    RAISE NOTICE 'Found % partitions', v_partition_count;

    -- Test 4: Test partition routing
    INSERT INTO episodic_memory.events (
        category, event_type, summary
    ) VALUES (
        'SYSTEM', 'routing_test', 'Testing partition routing'
    ) RETURNING id INTO v_test_id;

    ASSERT v_test_id IS NOT NULL, 'Could not insert test event';

    ASSERT EXISTS (SELECT 1 FROM episodic_memory.events WHERE id = v_test_id),
        'Inserted event not queryable from parent table';

    -- Test 5: Check session trigger functionality
    RAISE NOTICE 'Testing session event count trigger...';

    -- Create a test session
    INSERT INTO episodic_memory.sessions (session_type, user_id, status)
    VALUES ('test_session', gen_random_uuid(), 'active')
    RETURNING id INTO v_session_id;

    -- Get initial event count
    SELECT event_count INTO v_event_count_before
    FROM episodic_memory.sessions WHERE id = v_session_id;

    -- Insert an event for the session
    INSERT INTO episodic_memory.events (
        category, event_type, session_id, summary, actor_type
    ) VALUES (
        'SYSTEM', 'test_event', v_session_id, 'Test event', 'system'
    );

    -- Check event count updated
    SELECT event_count INTO v_event_count_after
    FROM episodic_memory.sessions WHERE id = v_session_id;

    ASSERT v_event_count_after = v_event_count_before + 1,
        'Session event count not updated by trigger';

    -- Cleanup
    DELETE FROM episodic_memory.sessions WHERE id = v_session_id;
    DELETE FROM episodic_memory.events WHERE id = v_test_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'EPISODIC MEMORY VERIFICATION PASSED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Partitions: %', v_partition_count;
    RAISE NOTICE 'Config: %', v_config_count;
    RAISE NOTICE 'Trigger Test: % -> % events', v_event_count_before, v_event_count_after;
END;
$verify$;