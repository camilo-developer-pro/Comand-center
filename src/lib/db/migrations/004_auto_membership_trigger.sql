-- ============================================================================
-- Command Center V3.1 - Automatic Workspace Membership
-- Migration: 004_auto_membership_trigger
-- Description: Automatically add workspace creator as owner
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION
-- Creates owner membership when a workspace is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the creator as owner of the new workspace
    INSERT INTO public.workspace_members (
        workspace_id,
        user_id,
        role,
        joined_at
    ) VALUES (
        NEW.id,
        NEW.owner_id,
        'owner',
        NOW()
    )
    ON CONFLICT (workspace_id, user_id) DO NOTHING; -- Prevent duplicates
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER
-- Fires after workspace creation
-- ============================================================================

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_workspace();

-- ============================================================================
-- TRIGGER FOR USER PROFILE SYNC (Optional but recommended)
-- Creates a profile record when a new auth user is created
-- ============================================================================

-- Create profiles table for additional user metadata
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles (for collaboration features)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATED_AT TRIGGER FOR PROFILES
-- ============================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_workspace() 
    IS 'Automatically adds workspace creator as owner member';

COMMENT ON FUNCTION public.handle_new_user() 
    IS 'Creates profile record for new auth users';

COMMENT ON TABLE public.profiles 
    IS 'User profiles for collaboration features';
