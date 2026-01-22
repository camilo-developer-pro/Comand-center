-- Migration: Enable pg_cron extension for scheduled jobs
-- Description: Allows scheduling of periodic database tasks like materialized view refresh
-- Requires: Supabase project with pg_cron enabled in Dashboard > Database > Extensions

-- Enable the extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role (required for scheduling)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for zero-lock analytics refresh';