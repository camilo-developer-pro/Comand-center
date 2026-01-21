-- =============================================
-- HOTFIX: RLS RECURSION & WORKSPACE ACCESS
-- =============================================

-- 1. BREAK THE LOOP: Redefine the function to avoid 'profiles' table
-- This checks your Super Admin status directly from your login email in the JWT claims.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM super_admin_whitelist 
        WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. NUKE ALL CONFLICTING POLICIES
DROP POLICY IF EXISTS "members_base_select" ON workspace_members;
DROP POLICY IF EXISTS "members_view_colleagues" ON workspace_members;
DROP POLICY IF EXISTS "workspaces_base_select" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "members_own_select" ON workspace_members;
DROP POLICY IF EXISTS "workspaces_own_select" ON workspaces;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- 3. APPLY LINEAR POLICIES (No Cross-Dependencies)

-- PROFILES: Only you or a Super Admin can see your profile
CREATE POLICY "profiles_linear_select" ON profiles
    FOR SELECT USING (id = auth.uid() OR is_super_admin());

-- WORKSPACE_MEMBERS: You can only see your own record (Breaking the loop)
-- This is the "Atomic" policy that everything else relies on.
CREATE POLICY "members_linear_select" ON workspace_members
    FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

-- WORKSPACES: You can see what you own OR what you are a member of
CREATE POLICY "workspaces_linear_select" ON workspaces
    FOR SELECT USING (
        owner_id = auth.uid() 
        OR is_super_admin()
        OR id IN (
            -- This subquery is now safe because 'members_linear_select' is simple
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

-- 4. EMERGENCY REPAIR: Manually link your 'Admin' workspace owner
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM workspaces
WHERE name = 'Admin' 
ON CONFLICT (workspace_id, user_id) DO NOTHING;
