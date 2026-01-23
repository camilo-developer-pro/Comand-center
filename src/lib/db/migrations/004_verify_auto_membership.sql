-- ============================================================================
-- Command Center V3.1 - Verification for Auto-Membership & Profiles
-- File: 004_verify_auto_membership.sql
-- ============================================================================

-- 1. Verify Triggers Exist
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgname IN ('on_workspace_created', 'on_auth_user_created');

-- 2. Verify Profiles Table Structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Verify Functions Exist
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('handle_new_workspace', 'handle_new_user')
AND routine_schema = 'public';

-- 4. Verify RLS Policies on Profiles
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================================================
-- MANUAL TEST INSTRUCTIONS (Run in Supabase Dashboard)
-- ============================================================================
/*
-- Step 1: Create a workspace (should auto-create membership)
INSERT INTO public.workspaces (name, slug, owner_id) 
VALUES ('Verification Workspace', 'verify-ws', auth.uid())
RETURNING id;

-- Step 2: Verify membership was created
SELECT * FROM public.workspace_members WHERE workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'verify-ws');
-- Expected: One row with role = 'owner'

-- Step 3: Cleanup
DELETE FROM public.workspaces WHERE slug = 'verify-ws';
*/
