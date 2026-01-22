-- File: migrations/012_logs_migration_execute.sql
-- Execute the logs migration using dual-write pattern

-- =====================================================
-- PHASE A: INITIALIZATION (Run first)
-- =====================================================

-- Initialize migration record
INSERT INTO migration.migration_status (
    migration_name,
    phase,
    started_at,
    notes
) VALUES (
    'logs_to_episodic_events',
    'initializing',
    NOW(),
    'Migrate public.logs to episodic_memory.events using dual-write pattern'
) ON CONFLICT (migration_name) DO NOTHING;

-- Count source rows (uncomment when public.logs exists)
-- UPDATE migration.migration_status
-- SET total_rows = (SELECT COUNT(*) FROM public.logs)
-- WHERE migration_name = 'logs_to_episodic_events';

-- =====================================================
-- PHASE B: DUAL-WRITE ENABLEMENT (Run when ready)
-- =====================================================

-- Enable the dual-write trigger for new inserts
-- CREATE TRIGGER trg_dual_write_logs_events
--     AFTER INSERT ON public.logs
--     FOR EACH ROW
--     EXECUTE FUNCTION migration.fn_dual_write_logs_to_events();

-- Update migration phase to dual_write
-- UPDATE migration.migration_status
-- SET phase = 'dual_write',
--     phase_changed_at = NOW()
-- WHERE migration_name = 'logs_to_episodic_events';

-- =====================================================
-- PHASE C: BACKFILL HISTORICAL DATA (Run after dual-write)
-- =====================================================

-- Run backfill procedure (may take time depending on data volume)
-- CALL migration.pr_backfill_logs_to_events(1000, 100);

-- Monitor progress
-- SELECT * FROM migration.migration_status WHERE migration_name = 'logs_to_episodic_events';

-- =====================================================
-- PHASE D: VALIDATION (Run after backfill completes)
-- =====================================================

-- Validate data integrity
-- SELECT * FROM migration.fn_validate_migration(
--     'logs_to_episodic_events',
--     'public', 'logs',  -- Source
--     'episodic_memory', 'events',  -- Target
--     'id'  -- Key column for comparison
-- );

-- Check validation results
-- SELECT * FROM migration.migration_status WHERE migration_name = 'logs_to_episodic_events';

-- =====================================================
-- PHASE E: CUTOVER (Run only if validation passes)
-- =====================================================

-- Perform the cutover (creates backward-compatible view)
-- SELECT migration.fn_cutover(
--     'logs_to_episodic_events',
--     'public', 'logs',  -- Source
--     'episodic_memory', 'events'  -- Target
-- );

-- Verify cutover completed
-- SELECT * FROM migration.migration_status WHERE migration_name = 'logs_to_episodic_events';

-- Test backward compatibility (old queries should still work)
-- SELECT COUNT(*) FROM public.logs;  -- Should work via view

-- =====================================================
-- MONITORING AND MAINTENANCE
-- =====================================================

-- View migration progress
SELECT * FROM migration.migration_status WHERE migration_name = 'logs_to_episodic_events';

-- View migration logs
SELECT logged_at, level, message FROM migration.migration_log
WHERE migration_name = 'logs_to_episodic_events'
ORDER BY logged_at DESC LIMIT 10;

-- Check trigger is active
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_dual_write_logs_events';

-- =====================================================
-- ROLLBACK (If needed - before cutover)
-- =====================================================

-- To rollback dual-write phase:
-- DROP TRIGGER IF EXISTS trg_dual_write_logs_events ON public.logs;
-- UPDATE migration.migration_status SET phase = 'rolled_back' WHERE migration_name = 'logs_to_episodic_events';

-- To rollback cutover:
-- DROP VIEW public.logs;
-- ALTER TABLE public.logs_legacy RENAME TO logs;
-- UPDATE migration.migration_status SET phase = 'rolled_back' WHERE migration_name = 'logs_to_episodic_events';