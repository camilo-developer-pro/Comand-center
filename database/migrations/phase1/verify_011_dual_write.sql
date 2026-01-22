-- File: verify_011_dual_write.sql

DO $verify$
DECLARE
    v_migration_name TEXT := 'test_migration';
    v_source_schema TEXT := 'public';
    v_target_schema TEXT := 'episodic_memory';
    v_trigger_created BOOLEAN;
BEGIN
    -- Test 1: Create migration status
    INSERT INTO migration.migration_status (migration_name, phase)
    VALUES (v_migration_name, 'dual_write');

    ASSERT EXISTS (
        SELECT 1 FROM migration.migration_status
        WHERE migration_name = v_migration_name AND phase = 'dual_write'
    ), 'Could not create migration status';

    -- Test 2: Test migration logging
    INSERT INTO migration.migration_log (migration_name, level, message, details)
    VALUES (v_migration_name, 'INFO', 'Test log entry', '{"test": true}');

    ASSERT EXISTS (
        SELECT 1 FROM migration.migration_log
        WHERE migration_name = v_migration_name AND message = 'Test log entry'
    ), 'Could not create migration log entry';

    -- Test 3: Test validation function (with empty tables)
    PERFORM migration.fn_validate_migration(
        v_migration_name,
        'episodic_memory', 'events',
        'episodic_memory', 'events',
        'id'
    );

    ASSERT EXISTS (
        SELECT 1 FROM migration.migration_status
        WHERE migration_name = v_migration_name
        AND validation_passed = TRUE
    ), 'Validation function not working correctly';

    -- Test 4: Test backfill function (with empty query)
    PERFORM migration.fn_backfill_batch(
        v_migration_name,
        'SELECT 1 as id WHERE FALSE',
        'SELECT $1',
        10,
        10
    );

    -- Should complete without errors
    RAISE NOTICE 'Test 4 PASSED: Backfill function executed without errors';

    -- Test 5: Clean up
    DELETE FROM migration.migration_log WHERE migration_name = v_migration_name;
    DELETE FROM migration.migration_status WHERE migration_name = v_migration_name;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL DUAL-WRITE INFRASTRUCTURE TESTS PASSED';
    RAISE NOTICE '========================================';
END;
$verify$;