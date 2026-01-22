-- Command Center V3.0 - Phase 1 Rollback Procedures
-- Use these procedures to rollback Phase 1 components in case of deployment issues

-- =============================================================================
-- 1. PARTIAL ROLLBACK PROCEDURES
-- =============================================================================

-- Rollback dual-write triggers
DO $$
BEGIN
    RAISE NOTICE 'Rolling back dual-write triggers...';

    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS trg_dual_write_logs_events ON public.logs;

    -- Update migration status
    UPDATE migration.migration_status
    SET phase = 'rolled_back',
        completed_at = NOW(),
        error_message = 'Rolled back via rollback script'
    WHERE migration_name = 'logs_to_episodic_events'
    AND phase = 'completed';

    RAISE NOTICE 'Dual-write triggers rolled back successfully';
END;
$$;

-- Rollback entity resolution
DO $$
DECLARE
    v_count INT;
BEGIN
    RAISE NOTICE 'Rolling back entity resolution...';

    -- Count entities that will be affected
    SELECT COUNT(*) INTO v_count
    FROM semantic_memory.entities
    WHERE status = 'merged'
    AND metadata->>'_merge_batch' IS NOT NULL;

    RAISE NOTICE 'Reverting % merged entities...', v_count;

    -- Revert merged entities
    UPDATE semantic_memory.entities
    SET status = 'active',
        merged_into_id = NULL,
        metadata = metadata - '_merge_batch' - '_merged_at'
    WHERE status = 'merged'
    AND metadata->>'_merge_batch' IS NOT NULL;

    RAISE NOTICE 'Entity resolution rolled back successfully';
END;
$$;

-- Disable entity resolution trigger temporarily
UPDATE semantic_memory.resolution_config
SET blocking_enabled = FALSE,
    strict_mode = FALSE
WHERE id = 1;

-- =============================================================================
-- 2. FULL ROLLBACK PROCEDURES (USE WITH CAUTION)
-- =============================================================================

-- WARNING: These procedures will DROP schemas and cannot be easily undone
-- Use only if you have a backup ready for restore

-- Rollback procedural memory schema
DROP SCHEMA IF EXISTS procedural_memory CASCADE;

-- Rollback semantic memory schema
DROP SCHEMA IF EXISTS semantic_memory CASCADE;

-- Rollback episodic memory schema
DROP SCHEMA IF EXISTS episodic_memory CASCADE;

-- Rollback pg_partman extensions and partitions
-- Note: This requires superuser access
DO $$
BEGIN
    -- Drop pg_partman extension (this will remove all partition tables)
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_partman') THEN
        DROP EXTENSION pg_partman CASCADE;
    END IF;
END;
$$;

-- Rollback vector extension
DROP EXTENSION IF EXISTS vector CASCADE;

-- Rollback pgcrypto extension
DROP EXTENSION IF EXISTS pgcrypto CASCADE;

-- Drop test schema
DROP SCHEMA IF EXISTS test CASCADE;

-- =============================================================================
-- 3. VERIFICATION QUERIES FOR ROLLBACK STATUS
-- =============================================================================

-- Check what schemas still exist
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE '%_memory'
   OR schema_name = 'test'
   OR schema_name = 'migration';

-- Check what extensions are still installed
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_partman', 'vector');

-- Check for remaining triggers
SELECT event_object_schema, event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_name LIKE '%dual_write%'
   OR trigger_name LIKE '%entity_resolution%';

-- Check entity status
SELECT status, COUNT(*)
FROM semantic_memory.entities
GROUP BY status;

-- =============================================================================
-- 4. POST-ROLLBACK CLEANUP
-- =============================================================================

-- Drop application role if it exists
DROP ROLE IF EXISTS command_center_app;

-- Clean up any remaining migration tracking (if migration schema exists)
DROP TABLE IF EXISTS migration.migration_status CASCADE;
DROP TABLE IF EXISTS migration.migration_log CASCADE;
DROP SCHEMA IF EXISTS migration CASCADE;

-- =============================================================================
-- 5. RESTORE FROM BACKUP (IF NEEDED)
-- =============================================================================

-- If you need to perform a full restore, use these commands:
-- (Run these from the command line, not in SQL)

-- 1. Terminate all connections to the database
-- psql -h $DB_HOST -U $DB_SUPERUSER -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

-- 2. Drop and recreate the database
-- dropdb -h $DB_HOST -U $DB_SUPERUSER $DB_NAME
-- createdb -h $DB_HOST -U $DB_SUPERUSER $DB_NAME

-- 3. Restore from backup
-- pg_restore -h $DB_HOST -U $DB_SUPERUSER -d $DB_NAME pre_phase1_backup.dump

-- =============================================================================
-- 6. MONITORING QUERIES POST-ROLLBACK
-- =============================================================================

-- Check that all Phase 1 objects are gone
SELECT 'Extensions' as check_type, COUNT(*) as count
FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_partman', 'vector')
UNION ALL
SELECT 'Schemas', COUNT(*)
FROM information_schema.schemata
WHERE schema_name IN ('episodic_memory', 'semantic_memory', 'procedural_memory', 'test', 'migration')
UNION ALL
SELECT 'Triggers', COUNT(*)
FROM information_schema.triggers
WHERE trigger_name LIKE '%dual_write%'
   OR trigger_name LIKE '%entity_resolution%'
UNION ALL
SELECT 'Roles', COUNT(*)
FROM pg_roles
WHERE rolname = 'command_center_app';