-- ============================================================================
-- Command Center V3.1 - Row-Level Security Policies
-- Migration: 003_rls_policies
-- Description: Implement multi-tenant access control at the database level
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- These functions simplify policy definitions and improve performance
-- ============================================================================

-- Function to check if current user is a member of a workspace
DROP FUNCTION IF EXISTS public.is_workspace_member(UUID);
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = $1
        AND workspace_members.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user has specific role in workspace
DROP FUNCTION IF EXISTS public.has_workspace_role(UUID, TEXT[]);
CREATE OR REPLACE FUNCTION public.has_workspace_role(
    workspace_id UUID,
    required_roles TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = $1
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get workspace_id for a document
DROP FUNCTION IF EXISTS public.get_document_workspace_id(UUID);
CREATE OR REPLACE FUNCTION public.get_document_workspace_id(doc_id UUID)
RETURNS UUID AS $$
DECLARE
    ws_id UUID;
BEGIN
    SELECT workspace_id INTO ws_id
    FROM public.documents
    WHERE id = doc_id;
    RETURN ws_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_edges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKSPACES TABLE POLICIES
-- ============================================================================

-- Users can view workspaces they are members of
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
CREATE POLICY "Users can view their workspaces"
    ON public.workspaces
    FOR SELECT
    USING (public.is_workspace_member(id));

-- Only owners can create workspaces (owner_id must match auth.uid())
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Only owners and admins can update workspace settings
DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspaces"
    ON public.workspaces
    FOR UPDATE
    USING (public.has_workspace_role(id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_workspace_role(id, ARRAY['owner', 'admin']));

-- Only owners can delete workspaces
DROP POLICY IF EXISTS "Only owners can delete workspaces" ON public.workspaces;
CREATE POLICY "Only owners can delete workspaces"
    ON public.workspaces
    FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================================================
-- WORKSPACE_MEMBERS TABLE POLICIES
-- ============================================================================

-- Members can view other members in their workspaces
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
    ON public.workspace_members
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Owners can add new members
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.workspace_members;
CREATE POLICY "Owners and admins can add members"
    ON public.workspace_members
    FOR INSERT
    WITH CHECK (
        public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
        -- Cannot add someone with higher role than yourself
        AND (
            CASE 
                WHEN public.has_workspace_role(workspace_id, ARRAY['owner']) THEN TRUE
                WHEN role IN ('member', 'viewer') THEN TRUE
                ELSE FALSE
            END
        )
    );

-- Owners and admins can update member roles
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.workspace_members;
CREATE POLICY "Owners and admins can update member roles"
    ON public.workspace_members
    FOR UPDATE
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
    WITH CHECK (
        -- Cannot promote to owner unless you are owner
        CASE 
            WHEN role = 'owner' THEN public.has_workspace_role(workspace_id, ARRAY['owner'])
            ELSE TRUE
        END
    );

-- Owners can remove members (except themselves)
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.workspace_members;
CREATE POLICY "Owners and admins can remove members"
    ON public.workspace_members
    FOR DELETE
    USING (
        public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
        -- Cannot remove yourself if you're the owner
        AND NOT (user_id = auth.uid() AND role = 'owner')
    );

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Users can view documents in their workspaces
DROP POLICY IF EXISTS "Users can view documents in their workspaces" ON public.documents;
CREATE POLICY "Users can view documents in their workspaces"
    ON public.documents
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Members (not viewers) can create documents
DROP POLICY IF EXISTS "Members can create documents" ON public.documents;
CREATE POLICY "Members can create documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (
        public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member'])
        AND created_by = auth.uid()
    );

-- Members can update documents they have access to
DROP POLICY IF EXISTS "Members can update documents" ON public.documents;
CREATE POLICY "Members can update documents"
    ON public.documents
    FOR UPDATE
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));

-- Owners and admins can delete documents
DROP POLICY IF EXISTS "Owners and admins can delete documents" ON public.documents;
CREATE POLICY "Owners and admins can delete documents"
    ON public.documents
    FOR DELETE
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

-- ============================================================================
-- BLOCKS TABLE POLICIES
-- These are the most critical policies - blocks inherit permissions from documents
-- ============================================================================

-- Users can view blocks if they can view the parent document
DROP POLICY IF EXISTS "Users can view blocks in accessible documents" ON public.blocks;
CREATE POLICY "Users can view blocks in accessible documents"
    ON public.blocks
    FOR SELECT
    USING (
        public.is_workspace_member(
            public.get_document_workspace_id(document_id)
        )
    );

-- Members can create blocks in documents they can edit
DROP POLICY IF EXISTS "Members can create blocks" ON public.blocks;
CREATE POLICY "Members can create blocks"
    ON public.blocks
    FOR INSERT
    WITH CHECK (
        public.has_workspace_role(
            public.get_document_workspace_id(document_id),
            ARRAY['owner', 'admin', 'member']
        )
    );

-- Members can update blocks
DROP POLICY IF EXISTS "Members can update blocks" ON public.blocks;
CREATE POLICY "Members can update blocks"
    ON public.blocks
    FOR UPDATE
    USING (
        public.has_workspace_role(
            public.get_document_workspace_id(document_id),
            ARRAY['owner', 'admin', 'member']
        )
    )
    WITH CHECK (
        public.has_workspace_role(
            public.get_document_workspace_id(document_id),
            ARRAY['owner', 'admin', 'member']
        )
    );

-- Owners and admins can delete blocks
DROP POLICY IF EXISTS "Owners and admins can delete blocks" ON public.blocks;
CREATE POLICY "Owners and admins can delete blocks"
    ON public.blocks
    FOR DELETE
    USING (
        public.has_workspace_role(
            public.get_document_workspace_id(document_id),
            ARRAY['owner', 'admin']
        )
    );

-- ============================================================================
-- KNOWLEDGE_GRAPH_EDGES TABLE POLICIES
-- ============================================================================

-- Users can view edges in their workspaces
DROP POLICY IF EXISTS "Users can view knowledge graph edges" ON public.knowledge_graph_edges;
CREATE POLICY "Users can view knowledge graph edges"
    ON public.knowledge_graph_edges
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- System can create edges (typically via Edge Functions with service role)
DROP POLICY IF EXISTS "System can create edges" ON public.knowledge_graph_edges;
CREATE POLICY "System can create edges"
    ON public.knowledge_graph_edges
    FOR INSERT
    WITH CHECK (
        -- Allow service role or workspace admins
        auth.jwt() ->> 'role' = 'service_role'
        OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
    );

-- System can update edges
DROP POLICY IF EXISTS "System can update edges" ON public.knowledge_graph_edges;
CREATE POLICY "System can update edges"
    ON public.knowledge_graph_edges
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
    );

-- ============================================================================
-- PERFORMANCE INDEXES FOR RLS
-- These indexes optimize the policy check queries
-- ============================================================================

-- Index for membership lookups (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_workspace_members_lookup 
    ON public.workspace_members(user_id, workspace_id);

-- Index for role-based lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_role_lookup 
    ON public.workspace_members(workspace_id, user_id, role);

-- ============================================================================
-- SECURITY DEFINER FUNCTION PERMISSIONS
-- Grant execute on helper functions to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_workspace_id(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view their workspaces" ON public.workspaces 
    IS 'Workspace visibility is determined by membership';

COMMENT ON POLICY "Users can view blocks in accessible documents" ON public.blocks 
    IS 'Block access inherits from document permissions via workspace membership';
