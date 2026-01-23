-- ============================================================================
-- Command Center V3.1 - Extension Enablement
-- Migration: 001_enable_extensions
-- Description: Enable required PostgreSQL extensions for Atomic Ingestion Layer
-- ============================================================================

-- Enable UUID generation (standard UUID functions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable ltree for hierarchical path-based queries
CREATE EXTENSION IF NOT EXISTS "ltree";

-- Enable pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable pg_net for async HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Enable pg_cron for scheduled background jobs
-- Note: In some Supabase versions, this must be enabled via the UI
-- or may report "dependent privileges exist". We wrap this in a DO block
-- with error handling to prevent migration failure.
DO $$ 
BEGIN
    -- Try to enable pg_cron if not present
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        CREATE EXTENSION "pg_cron";
    END IF;
EXCEPTION
    WHEN others THEN
        -- Catch "dependent privileges exist" (2BP01) or other setup errors
        -- In Supabase, this often happens if pg_cron is already semi-configured
        -- or if the 'postgres' role has existing permissions that conflict with
        -- the internal 'after-create.sql' script.
        RAISE NOTICE 'Notice: pg_cron extension enablement skipped or handled with warning: %', SQLERRM;
END $$;

-- Verify all extensions
SELECT
    extname AS extension_name,
    extversion AS version,
    n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN ('uuid-ossp', 'ltree', 'vector', 'pg_net', 'pg_cron')
ORDER BY extname;
