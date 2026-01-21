-- ============================================
-- SUPER ADMIN SYSTEM ROLE
-- Safe migration - can run after Phase 5
-- ============================================

-- Step 1: Create ENUM only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'system_role') THEN
        CREATE TYPE system_role AS ENUM ('user', 'super_admin');
    END IF;
END $$;

-- Step 2: Add system_role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'system_role'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN system_role system_role NOT NULL DEFAULT 'user';
    END IF;
END $$;

-- Step 3: Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON profiles(system_role);

-- ============================================
-- SUPER ADMIN WHITELIST TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS super_admin_whitelist (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Insert the authorized super admin (ignore if exists)
INSERT INTO super_admin_whitelist (email, notes) 
VALUES ('camilotfx@gmail.com', 'System Owner - V1.1 Development')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FUNCTION: Check if user is super admin
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM profiles p
        JOIN super_admin_whitelist w ON LOWER(p.email) = LOWER(w.email)
        WHERE p.id = auth.uid()
        AND p.system_role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Promote user to super admin
-- ============================================

CREATE OR REPLACE FUNCTION promote_to_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Check if email is in whitelist
    IF NOT EXISTS (
        SELECT 1 FROM super_admin_whitelist 
        WHERE LOWER(email) = LOWER(user_email)
    ) THEN
        RAISE EXCEPTION 'Email not in super admin whitelist';
    END IF;
    
    -- Get user ID from profiles
    SELECT id INTO target_user_id 
    FROM profiles 
    WHERE LOWER(email) = LOWER(user_email);
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found in profiles. Please sign up first.';
    END IF;
    
    -- Promote to super admin
    UPDATE profiles 
    SET system_role = 'super_admin'
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS super_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON super_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON super_admin_audit_log(created_at DESC);

-- ============================================
-- SAFE RLS POLICY UPDATES
-- Pattern: DROP IF EXISTS → CREATE
-- This preserves existing functionality while adding super admin bypass
-- ============================================

-- ==================
-- WORKSPACES POLICIES
-- ==================

-- SELECT policy
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces;
CREATE POLICY "Users can view workspaces" ON workspaces
    FOR SELECT USING (
        is_super_admin() 
        OR id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
        OR owner_id = auth.uid()
    );

-- UPDATE policy
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
CREATE POLICY "Owners can update workspaces" ON workspaces
    FOR UPDATE USING (
        is_super_admin()
        OR owner_id = auth.uid()
    );

-- DELETE policy
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;
CREATE POLICY "Owners can delete workspaces" ON workspaces
    FOR DELETE USING (
        is_super_admin()
        OR owner_id = auth.uid()
    );

-- INSERT policy (keep as-is, super admin creates normally)
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id
    );

-- ==================
-- DOCUMENTS POLICIES
-- ==================

DROP POLICY IF EXISTS "Users can view documents in their workspaces" ON documents;
DROP POLICY IF EXISTS "Users can view documents" ON documents;
CREATE POLICY "Users can view documents" ON documents
    FOR SELECT USING (
        is_super_admin()
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert documents in their workspaces" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
CREATE POLICY "Users can insert documents" ON documents
    FOR INSERT WITH CHECK (
        is_super_admin()
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update documents in their workspaces" ON documents;
DROP POLICY IF EXISTS "Users can update documents" ON documents;
CREATE POLICY "Users can update documents" ON documents
    FOR UPDATE USING (
        is_super_admin()
        OR workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete documents in their workspaces" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;
CREATE POLICY "Users can delete documents" ON documents
    FOR DELETE USING (
        is_super_admin()
        OR (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()
            )
            AND created_by = auth.uid()
        )
    );

-- ==================
-- CRM_LEADS POLICIES
-- ==================

-- Only applying policies if the table exists (Safe approach)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_leads') THEN
        
        DROP POLICY IF EXISTS "Users can view leads in their workspaces" ON crm_leads;
        DROP POLICY IF EXISTS "Users can view leads" ON crm_leads;
        EXECUTE 'CREATE POLICY "Users can view leads" ON crm_leads FOR SELECT USING (is_super_admin() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))';

        DROP POLICY IF EXISTS "Users can insert leads in their workspaces" ON crm_leads;
        DROP POLICY IF EXISTS "Users can insert leads" ON crm_leads;
        EXECUTE 'CREATE POLICY "Users can insert leads" ON crm_leads FOR INSERT WITH CHECK (is_super_admin() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))';

        DROP POLICY IF EXISTS "Users can update leads in their workspaces" ON crm_leads;
        DROP POLICY IF EXISTS "Users can update leads" ON crm_leads;
        EXECUTE 'CREATE POLICY "Users can update leads" ON crm_leads FOR UPDATE USING (is_super_admin() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))';

        DROP POLICY IF EXISTS "Users can delete leads in their workspaces" ON crm_leads;
        DROP POLICY IF EXISTS "Users can delete leads" ON crm_leads;
        EXECUTE 'CREATE POLICY "Users can delete leads" ON crm_leads FOR DELETE USING (is_super_admin() OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))';

    END IF;
END $$;


-- ==================
-- WORKSPACE_MEMBERS POLICIES
-- ==================

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members" ON workspace_members
    FOR SELECT USING (
        is_super_admin()
        OR workspace_id IN (
            SELECT wm2.workspace_id FROM workspace_members wm2
            WHERE wm2.user_id = auth.uid()
        )
    );

-- ==================
-- PROFILES POLICIES
-- ==================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles
    FOR SELECT USING (
        is_super_admin()
        OR id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        id = auth.uid()
    );

-- ============================================
-- PROTECT SUPER ADMIN TABLES
-- ============================================

-- Whitelist: No API access
ALTER TABLE super_admin_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No API access to whitelist" ON super_admin_whitelist;
CREATE POLICY "No API access to whitelist" ON super_admin_whitelist
    FOR ALL USING (false);

-- Audit log: Only super admins can view
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view audit log" ON super_admin_audit_log;
CREATE POLICY "Super admins can view audit log" ON super_admin_audit_log
    FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "System can insert audit log" ON super_admin_audit_log;
CREATE POLICY "System can insert audit log" ON super_admin_audit_log
    FOR INSERT WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================

-- Check if migration was successful:
-- SELECT * FROM super_admin_whitelist;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'system_role';
-- SELECT proname FROM pg_proc WHERE proname = 'is_super_admin';
