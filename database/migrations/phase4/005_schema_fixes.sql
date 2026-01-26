-- ============================================================================
-- Command Center V3.1 - Phase 4: Schema Fixes from Stress Testing
-- Migration: 005_schema_fixes
-- ============================================================================

-- 1. Fix mv_refresh_queue uniqueness
-- This prevents the 'ON CONFLICT' error in queue_stats_refresh() trigger
ALTER TABLE mv_refresh_queue 
DROP CONSTRAINT IF EXISTS mv_refresh_queue_view_workspace_unique;

ALTER TABLE mv_refresh_queue 
ADD CONSTRAINT mv_refresh_queue_view_workspace_unique 
UNIQUE (view_name, workspace_id);

-- 2. Defer async_processing_errors foreign key
-- This prevents transactions from failing if we log an error before the block is committed
ALTER TABLE async_processing_errors 
DROP CONSTRAINT IF EXISTS async_processing_errors_block_id_fkey;

ALTER TABLE async_processing_errors 
ADD CONSTRAINT async_processing_errors_block_id_fkey 
FOREIGN KEY (block_id) REFERENCES blocks(id) 
ON DELETE CASCADE 
DEFERRABLE INITIALLY DEFERRED;
