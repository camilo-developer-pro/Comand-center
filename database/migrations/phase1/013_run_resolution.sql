-- File: migrations/013_run_resolution.sql
-- Execute entity deduplication on existing entities

-- =====================================================
-- RUN ENTITY RESOLUTION ON EXISTING DATA
-- =====================================================

-- Check current entity counts
SELECT
    entity_type,
    status,
    COUNT(*) as count
FROM semantic_memory.entities
GROUP BY entity_type, status
ORDER BY entity_type, status;

-- =====================================================
-- PHASE 1: TEST WITH SMALL SAMPLE
-- =====================================================

-- Test resolution on a small sample of entities first
-- CALL migration.pr_resolve_entities_batch(
--     p_entity_type => 'person',  -- or NULL for all types
--     p_batch_size => 100,
--     p_similarity_threshold => 0.95
-- );

-- Check results
-- SELECT * FROM migration.entity_resolution_batches ORDER BY id DESC LIMIT 5;
-- SELECT COUNT(*) FROM migration.entity_resolution_matches;
-- SELECT golden_record_id, COUNT(*) as duplicates_found
-- FROM migration.entity_resolution_matches
-- GROUP BY golden_record_id
-- ORDER BY duplicates_found DESC LIMIT 10;

-- =====================================================
-- PHASE 2: FULL RESOLUTION RUN
-- =====================================================

-- Run full resolution on all entities
-- This may take significant time depending on entity count
-- CALL migration.pr_resolve_all_entities(
--     p_batch_size => 1000,
--     p_similarity_threshold => 0.90,
--     p_max_batches => 1000
-- );

-- =====================================================
-- MONITORING AND VERIFICATION
-- =====================================================

-- Check overall progress
SELECT
    SUM(entities_processed) as total_processed,
    SUM(duplicates_found) as total_duplicates,
    SUM(merges_performed) as total_merges,
    COUNT(*) as batches_completed
FROM migration.entity_resolution_batches
WHERE status = 'completed';

-- Check merge results
SELECT
    status,
    COUNT(*) as entity_count
FROM semantic_memory.entities
GROUP BY status
ORDER BY status;

-- Check golden records (entities that absorbed duplicates)
SELECT
    e.id,
    e.canonical_name,
    e.entity_type,
    COUNT(m.golden_record_id) as duplicates_merged
FROM semantic_memory.entities e
LEFT JOIN migration.entity_resolution_matches m ON e.id = m.golden_record_id
WHERE e.status != 'merged'
GROUP BY e.id, e.canonical_name, e.entity_type
HAVING COUNT(m.golden_record_id) > 0
ORDER BY duplicates_merged DESC
LIMIT 20;

-- Check recently merged entities
SELECT
    e.canonical_name,
    e.status,
    g.canonical_name as merged_into,
    m.merged_at
FROM semantic_memory.entities e
JOIN semantic_memory.entities g ON e.merged_into_id = g.id
JOIN migration.entity_resolution_matches m ON e.id = m.duplicate_id
ORDER BY m.merged_at DESC
LIMIT 20;

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- Verify no orphaned relationships
SELECT COUNT(*) as orphaned_relationships
FROM semantic_memory.entity_relationships r
LEFT JOIN semantic_memory.entities e1 ON r.source_entity_id = e1.id
LEFT JOIN semantic_memory.entities e2 ON r.target_entity_id = e2.id
WHERE e1.id IS NULL OR e2.id IS NULL;

-- Verify alias transfers
SELECT
    'aliases_transferred' as check_type,
    COUNT(*) as count
FROM semantic_memory.entity_aliases a
JOIN semantic_memory.entities e ON a.entity_id = e.id
WHERE a.source LIKE 'merge:%';

-- Verify property transfers
SELECT
    'properties_transferred' as check_type,
    COUNT(*) as count
FROM semantic_memory.entity_properties p
JOIN semantic_memory.entities e ON p.entity_id = e.id
WHERE p.source LIKE 'merge:%';

-- =====================================================
-- PERFORMANCE ANALYSIS
-- =====================================================

-- Check batch performance
SELECT
    id,
    batch_number,
    entities_processed,
    duplicates_found,
    merges_performed,
    EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
    CASE WHEN entities_processed > 0
         THEN ROUND(merges_performed::NUMERIC / entities_processed * 100, 2)
         ELSE 0 END as merge_rate_percent
FROM migration.entity_resolution_batches
WHERE status = 'completed'
ORDER BY id;

-- =====================================================
-- ROLLBACK (If needed)
-- =====================================================

-- WARNING: These operations are destructive and should be used with extreme caution

-- To unmerge a specific entity (experimental - requires manual verification):
-- UPDATE semantic_memory.entities
-- SET status = 'active', merged_into_id = NULL, updated_at = NOW()
-- WHERE id = 'specific-entity-id';

-- To reset resolution for a batch (removes merges but keeps match records):
-- UPDATE semantic_memory.entities
-- SET status = 'active', merged_into_id = NULL, updated_at = NOW()
-- WHERE metadata->>'_merge_batch' = 'batch-id-to-reset';