-- ============================================================================
-- RLS Policy Verification Script
-- Run this to verify all policies are correctly configured
-- ============================================================================

-- Check that RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workspaces', 'workspace_members', 'documents', 'blocks', 'knowledge_graph_edges')
ORDER BY tablename;

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using,
    with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table (expected: 4-5 per table)
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Verify helper functions exist
SELECT 
    proname AS function_name,
    prosecdef AS security_definer
FROM pg_proc
WHERE proname IN ('is_workspace_member', 'has_workspace_role', 'get_document_workspace_id')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
