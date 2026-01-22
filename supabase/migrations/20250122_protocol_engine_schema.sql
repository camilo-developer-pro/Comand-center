-- Migration: 20250122_protocol_engine_schema.sql
-- Command Center V3.0 - Milestone 2.2: Protocol Engine Schema
-- Creates the agent_runtime schema with protocol storage and execution tracking

-- Create protocol storage schema
CREATE SCHEMA IF NOT EXISTS agent_runtime;

-- Protocol definition table
CREATE TABLE agent_runtime.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Protocol metadata
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    description TEXT,
    protocol_type TEXT NOT NULL CHECK (protocol_type IN (
        'ingestion', 'resolution', 'error_handling', 'workflow', 'custom'
    )),
    
    -- Protocol definition (JSON validated against schema)
    definition JSONB NOT NULL,
    
    -- Execution configuration
    max_steps INT DEFAULT 10,
    timeout_seconds INT DEFAULT 300,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "backoff_ms": 1000}'::JSONB,
    
    -- State
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,  -- System protocols cannot be deleted
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    
    -- Unique constraint
    UNIQUE(workspace_id, name, version)
);

-- Protocol execution history
CREATE TABLE agent_runtime.protocol_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES agent_runtime.protocols(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    
    -- Execution context
    trigger_type TEXT NOT NULL,  -- 'manual', 'scheduled', 'event', 'chained'
    trigger_payload JSONB,
    
    -- State machine tracking
    current_step TEXT,
    steps_completed TEXT[] DEFAULT ARRAY[]::TEXT[],
    step_outputs JSONB DEFAULT '{}'::JSONB,
    
    -- Scaffold (hydrated context)
    scaffold JSONB DEFAULT '{}'::JSONB,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
    )),
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- LLM interaction tracking
    llm_calls INT DEFAULT 0,
    total_tokens INT DEFAULT 0
);

-- Create indexes for optimal query performance
CREATE INDEX idx_protocols_workspace ON agent_runtime.protocols(workspace_id, is_active);
CREATE INDEX idx_protocols_type ON agent_runtime.protocols(protocol_type) WHERE is_active = true;
CREATE INDEX idx_protocols_system ON agent_runtime.protocols(is_system) WHERE is_system = true;
CREATE INDEX idx_executions_protocol ON agent_runtime.protocol_executions(protocol_id, status);
CREATE INDEX idx_executions_workspace ON agent_runtime.protocol_executions(workspace_id, created_at DESC);
CREATE INDEX idx_executions_status ON agent_runtime.protocol_executions(status) WHERE status IN ('pending', 'running', 'paused');

-- Enable RLS
ALTER TABLE agent_runtime.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runtime.protocol_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for protocols table
CREATE POLICY "Users can view workspace protocols"
    ON agent_runtime.protocols FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage workspace protocols"
    ON agent_runtime.protocols FOR ALL
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Prevent deletion of system protocols
CREATE POLICY "System protocols cannot be deleted"
    ON agent_runtime.protocols FOR DELETE
    USING (is_system = false);

-- RLS Policies for executions table
CREATE POLICY "Users can view workspace executions"
    ON agent_runtime.protocol_executions FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create workspace executions"
    ON agent_runtime.protocol_executions FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update own workspace executions"
    ON agent_runtime.protocol_executions FOR UPDATE
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    ));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION agent_runtime.update_protocol_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protocols_updated_at
    BEFORE UPDATE ON agent_runtime.protocols
    FOR EACH ROW
    EXECUTE FUNCTION agent_runtime.update_protocol_timestamp();

-- Grant permissions
GRANT USAGE ON SCHEMA agent_runtime TO authenticated;
GRANT ALL ON agent_runtime.protocols TO authenticated;
GRANT ALL ON agent_runtime.protocol_executions TO authenticated;

-- Add comment documentation
COMMENT ON SCHEMA agent_runtime IS 'Protocol Engine runtime schema for V3.0 autonomous agent capabilities';
COMMENT ON TABLE agent_runtime.protocols IS 'Protocol definitions - deterministic state machines guiding agent behavior';
COMMENT ON TABLE agent_runtime.protocol_executions IS 'Execution history and state tracking for protocol runs';
COMMENT ON COLUMN agent_runtime.protocols.definition IS 'JSON definition validated against PROTOCOL_SCHEMA - the DNA of agent behavior';
COMMENT ON COLUMN agent_runtime.protocol_executions.scaffold IS 'Hydrated context data available during execution';
