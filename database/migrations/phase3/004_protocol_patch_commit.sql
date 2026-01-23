-- File: database/migrations/phase3/004_protocol_patch_commit.sql
-- Phase 3: Protocol Patch Commit Infrastructure

-- Protocol version history table
CREATE TABLE IF NOT EXISTS procedural_memory.protocol_versions (
    id UUID PRIMARY KEY DEFAULT generate_uuidv7(),
    protocol_id UUID NOT NULL REFERENCES procedural_memory.protocols(id),
    version INT NOT NULL,
    definition JSONB NOT NULL,
    patch_reason TEXT,
    patched_from_error_id UUID REFERENCES episodic_memory.error_logs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT DEFAULT 'meta_agent',

    UNIQUE(protocol_id, version)
);

-- Atomic patch commit function
CREATE OR REPLACE FUNCTION procedural_memory.commit_protocol_patch(
    p_protocol_id UUID,
    p_new_definition JSONB,
    p_patch_reason TEXT,
    p_error_id UUID
)
RETURNS TABLE (new_version INT, committed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version INT;
    v_new_version INT;
    v_old_definition JSONB;
BEGIN
    -- Lock the protocol row
    SELECT version, definition INTO v_current_version, v_old_definition
    FROM procedural_memory.protocols
    WHERE id = p_protocol_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Protocol not found: %', p_protocol_id;
    END IF;

    v_new_version := v_current_version + 1;

    -- Archive current version
    INSERT INTO procedural_memory.protocol_versions (
        protocol_id, version, definition, patch_reason, patched_from_error_id
    ) VALUES (
        p_protocol_id, v_current_version, v_old_definition, p_patch_reason, p_error_id
    );

    -- Update to new version
    UPDATE procedural_memory.protocols
    SET
        definition = p_new_definition,
        version = v_new_version,
        updated_at = NOW()
    WHERE id = p_protocol_id;

    -- Mark error as patched
    UPDATE episodic_memory.error_logs
    SET
        patched_at = NOW(),
        patch_version = v_new_version
    WHERE id = p_error_id;

    -- Notify listeners
    PERFORM pg_notify('protocol_patched', json_build_object(
        'protocol_id', p_protocol_id,
        'new_version', v_new_version,
        'error_id', p_error_id
    )::TEXT);

    RETURN QUERY SELECT v_new_version, NOW();
END;
$$;