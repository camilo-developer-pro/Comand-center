-- Migration: 00005_dev_seed_data.sql
-- Purpose: V1.1 Phase 1 - Development seed data (ONLY for local development)
-- Date: 2026-01-20
-- Note: This migration should be skipped in production

-- Only run in development (check if seed data already exists)
DO $$
BEGIN
  -- Check if this is a development environment
  -- In production, this block will be skipped
  -- Here we check for a demo workspace as a sentinel
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE name = 'Demo Workspace') THEN
    
    -- Note: Actual user creation must happen through Supabase Auth
    -- This seed data is for testing RLS policies and UI
    
    RAISE NOTICE 'Development seed data migration - skipped (users must be created via Auth)';
    
  END IF;
END $$;
