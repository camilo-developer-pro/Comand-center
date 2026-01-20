-- Migration: 00006_crm_seed_data.sql
-- Purpose: V1.1 Phase 2 - Seed data for CRM leads testing
-- Date: 2026-01-20
-- Note: This migration handles both fresh installs and updates to existing crm_leads tables

-- ============================================================
-- SECTION 1: Update lead_status ENUM
-- ============================================================

-- Add 'negotiation' to the existing enum if it doesn't exist
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE 'negotiation' AFTER 'proposal';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: Update crm_leads table schema
-- ============================================================

-- Add created_by column if it doesn't exist (fixing the error you saw)
ALTER TABLE crm_leads 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure value column has correct defaults and constraints
ALTER TABLE crm_leads 
  ALTER COLUMN value SET DEFAULT 0,
  ALTER COLUMN value SET NOT NULL;

-- Ensure required fields from V1.1 are NOT NULL
ALTER TABLE crm_leads 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN email SET NOT NULL;

-- ============================================================
-- SECTION 3: Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_crm_leads_workspace ON crm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_by ON crm_leads(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_leads_value ON crm_leads(value DESC);

-- ============================================================
-- SECTION 4: Enable RLS
-- ============================================================

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 5: RLS Policies for crm_leads
-- ============================================================

-- Drop all possible variations of the policies to avoid conflicts with 00001
DROP POLICY IF EXISTS "Users can view leads in their workspaces" ON crm_leads;
DROP POLICY IF EXISTS "Users can create leads in their workspaces" ON crm_leads;
DROP POLICY IF EXISTS "Users can update leads in their workspaces" ON crm_leads;
DROP POLICY IF EXISTS "Users can delete leads in their workspaces" ON crm_leads;
DROP POLICY IF EXISTS "Users can view leads in their workspace" ON crm_leads;
DROP POLICY IF EXISTS "Users can insert leads in their workspace" ON crm_leads;
DROP POLICY IF EXISTS "Users can update leads in their workspace" ON crm_leads;
DROP POLICY IF EXISTS "Users can delete leads in their workspace" ON crm_leads;

-- Consolidated policies matching Phase 2 requirements and project standards
CREATE POLICY "Users can view leads in their workspace"
ON crm_leads FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert leads in their workspace"
ON crm_leads FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
  AND (created_by IS NULL OR created_by = auth.uid())
);

CREATE POLICY "Users can update leads in their workspace"
ON crm_leads FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete leads in their workspace"
ON crm_leads FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- SECTION 6: Auto-update timestamps trigger
-- ============================================================

DROP TRIGGER IF EXISTS trigger_crm_leads_updated_at ON crm_leads;
CREATE TRIGGER trigger_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SECTION 7: Function to seed sample leads
-- ============================================================

CREATE OR REPLACE FUNCTION seed_sample_leads(p_workspace_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only seed if no leads exist for this workspace
  IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE workspace_id = p_workspace_id) THEN
    INSERT INTO crm_leads (name, email, company, status, value, notes, workspace_id, created_by)
    VALUES
      ('Alice Johnson', 'alice@techcorp.com', 'TechCorp Inc.', 'qualified', 75000.00, 'Interested in enterprise plan', p_workspace_id, p_user_id),
      ('Bob Smith', 'bob@startup.io', 'Startup.io', 'new', 15000.00, 'Inbound from website', p_workspace_id, p_user_id),
      ('Carol Williams', 'carol@bigco.com', 'BigCo Industries', 'proposal', 250000.00, 'Sent proposal on Jan 15', p_workspace_id, p_user_id),
      ('David Brown', 'david@agency.co', 'Creative Agency', 'contacted', 35000.00, 'Follow up scheduled for next week', p_workspace_id, p_user_id),
      ('Eva Martinez', 'eva@retail.com', 'Retail Plus', 'negotiation', 120000.00, 'Negotiating contract terms', p_workspace_id, p_user_id),
      ('Frank Lee', 'frank@consulting.biz', 'Lee Consulting', 'won', 45000.00, 'Closed! Starting onboarding', p_workspace_id, p_user_id),
      ('Grace Kim', 'grace@design.studio', 'Design Studio', 'lost', 28000.00, 'Went with competitor', p_workspace_id, p_user_id),
      ('Henry Chen', 'henry@finance.co', 'FinanceCo', 'qualified', 180000.00, 'Demo scheduled for Friday', p_workspace_id, p_user_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_sample_leads(UUID, UUID) TO authenticated;
