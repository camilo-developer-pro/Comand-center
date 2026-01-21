-- Migration: Fractional Indexing Test Helpers
-- Version: V2.1
-- Description: SECURITY DEFINER functions for testing without RLS blockers

-- 1. Get a test workspace ID (for anon users in tests)
CREATE OR REPLACE FUNCTION get_test_workspace_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.workspaces LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cleanup test data for a workspace
CREATE OR REPLACE FUNCTION cleanup_test_workspace_items(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.items
    WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get ordered items for verification
CREATE OR REPLACE FUNCTION get_test_ordered_items(p_workspace_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(t) FROM (
            SELECT id, name, rank_key
            FROM public.items
            WHERE workspace_id = p_workspace_id
            ORDER BY rank_key COLLATE "C"
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to tests
GRANT EXECUTE ON FUNCTION get_test_workspace_id TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_test_workspace_items TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_test_ordered_items TO anon, authenticated;

COMMENT ON FUNCTION get_test_workspace_id IS 'TEST ONLY: Bypasses RLS to find a workspace for Vitest suites';
COMMENT ON FUNCTION cleanup_test_workspace_items IS 'TEST ONLY: Bypasses RLS to cleanup items during tests';
COMMENT ON FUNCTION get_test_ordered_items IS 'TEST ONLY: Bypasses RLS to verify lexicographical ordering';
