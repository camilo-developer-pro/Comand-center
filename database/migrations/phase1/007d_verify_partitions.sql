-- File: migrations/phase1/007d_verify_partitions.sql

DO $verify$
DECLARE
    v_partition_count INT;
    v_config_count INT;
    v_test_id UUID;
BEGIN
    -- Test 1: Check partition config exists
    SELECT COUNT(*) INTO v_config_count
    FROM partition_mgmt.partition_config
    WHERE parent_schema = 'episodic_memory' AND parent_table = 'events';

    IF v_config_count != 1 THEN
        RAISE EXCEPTION 'Test 1 FAILED: Partition config not found';
    END IF;
    RAISE NOTICE 'Test 1 PASSED: Partition config exists';

    -- Test 2: Check partitions were created
    SELECT COUNT(*) INTO v_partition_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class parent ON parent.oid = i.inhparent
    WHERE n.nspname = 'episodic_memory'
    AND parent.relname = 'events';

    IF v_partition_count < 4 THEN
        RAISE EXCEPTION 'Test 2 FAILED: Expected at least 4 partitions, found %', v_partition_count;
    END IF;
    RAISE NOTICE 'Test 2 PASSED: % partitions exist', v_partition_count;

    -- Test 3: Insert test event (should route to correct partition)
    INSERT INTO episodic_memory.events (
        category, event_type, summary
    ) VALUES (
        'SYSTEM', 'partition_test', 'Testing partition routing'
    ) RETURNING id INTO v_test_id;

    IF v_test_id IS NULL THEN
        RAISE EXCEPTION 'Test 3 FAILED: Could not insert event';
    END IF;
    RAISE NOTICE 'Test 3 PASSED: Event inserted with ID %', v_test_id;

    -- Test 4: Verify event is queryable
    IF NOT EXISTS (SELECT 1 FROM episodic_memory.events WHERE id = v_test_id) THEN
        RAISE EXCEPTION 'Test 4 FAILED: Inserted event not found';
    END IF;
    RAISE NOTICE 'Test 4 PASSED: Event queryable from parent table';

    -- Cleanup test event
    DELETE FROM episodic_memory.events WHERE id = v_test_id;

    -- Test 5: Verify maintenance function works
    PERFORM * FROM partition_mgmt.run_maintenance();
    RAISE NOTICE 'Test 5 PASSED: Maintenance function executed';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ALL PARTITIONING TESTS PASSED';
    RAISE NOTICE '==========================================';
END;
$verify$;

-- Show final partition status
SELECT
    c.relname AS partition_name,
    pg_get_expr(c.relpartbound, c.oid) AS partition_range,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_inherits i ON i.inhrelid = c.oid
JOIN pg_class parent ON parent.oid = i.inhparent
WHERE n.nspname = 'episodic_memory'
AND parent.relname = 'events'
ORDER BY c.relname;