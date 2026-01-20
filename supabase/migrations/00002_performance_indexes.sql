-- Migration: 00002_performance_indexes.sql
-- Purpose: Phase 4 - Performance Optimization Indexes
-- Date: 2026-01-20

-- ============================================================
-- SECTION 1: Verify and Create GIN Index on widget_index Array
-- ============================================================

-- Drop if exists to ensure clean state (idempotent migration)
DROP INDEX IF EXISTS idx_documents_widget_index;

-- Create GIN index for array containment operations (@>, &&)
-- GIN (Generalized Inverted Index) is optimal for array types
CREATE INDEX idx_documents_widget_index 
ON documents USING GIN (widget_index);

-- ============================================================
-- SECTION 2: Composite Index for Common Query Patterns
-- ============================================================

-- Index for filtering by workspace + widget type (most common query)
DROP INDEX IF EXISTS idx_documents_workspace_widgets;

CREATE INDEX idx_documents_workspace_widgets 
ON documents (workspace_id) 
INCLUDE (widget_index, title, updated_at);

-- ============================================================
-- SECTION 3: Verify JSONB Index (created in Phase 1)
-- ============================================================

-- Ensure the jsonb_path_ops index exists for fallback queries
DROP INDEX IF EXISTS idx_documents_content_path;

CREATE INDEX idx_documents_content_path 
ON documents USING GIN (content jsonb_path_ops);

-- ============================================================
-- SECTION 4: Statistics Update
-- ============================================================

-- Analyze the table to update query planner statistics
ANALYZE documents;

-- ============================================================
-- SECTION 5: Performance Verification Query (for testing)
-- ============================================================

-- This query should use idx_documents_widget_index
-- Run EXPLAIN ANALYZE to verify index usage:
-- EXPLAIN ANALYZE 
-- SELECT id, title FROM documents WHERE widget_index @> ARRAY['crm-leads'];
