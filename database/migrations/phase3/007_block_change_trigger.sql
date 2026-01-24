-- Migration 007: Block Change Detection Trigger for GraphRAG
-- Phase 3, Week 7: Asynchronous Triggers
-- 
-- Purpose: Create a PostgreSQL trigger that detects meaningful content changes
-- in the blocks table and asynchronously calls a Supabase Edge Function
-- for entity extraction and graph updates via pg_net.
--
-- This implements the "Incremental GraphRAG" architecture from the V3.1 Execution Blueprint.
-- When a user edits a block, this trigger fires, computes a SHA-256 hash,
-- and if the content has changed meaningfully, sends an async HTTP request
-- to the Edge Function for processing.

-- Enable required extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For SHA-256 hashing
CREATE EXTENSION IF NOT EXISTS "pg_net";   -- For async HTTP calls

-- Create error logging table for async processing failures
-- This helps with monitoring and debugging failed Edge Function calls
CREATE TABLE IF NOT EXISTS public.async_processing_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    http_status_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- Create index for faster error lookup by block and unresolved status
CREATE INDEX IF NOT EXISTS idx_async_errors_block_id ON public.async_processing_errors(block_id);
CREATE INDEX IF NOT EXISTS idx_async_errors_unresolved ON public.async_processing_errors(resolved_at) WHERE resolved_at IS NULL;

-- Helper function to compute SHA-256 hash of JSONB content
-- Used to detect meaningful changes (not just whitespace or formatting)
CREATE OR REPLACE FUNCTION public.compute_content_hash(content JSONB)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
DECLARE
    content_text TEXT;
    hash_result VARCHAR(64);
BEGIN
    -- Convert JSONB to normalized text representation
    -- This ensures consistent hashing regardless of JSON formatting
    content_text := content::TEXT;
    
    -- Compute SHA-256 hash
    hash_result := encode(digest(content_text, 'sha256'), 'hex');
    
    RETURN hash_result;
END;
$$;

-- Main trigger function: fn_notify_block_change
-- This function is called BEFORE INSERT OR UPDATE on the blocks table
-- It compares the new content hash with the old one (if exists)
-- If content has changed meaningfully, it sends an async HTTP request
-- to the Edge Function via pg_net for entity extraction and graph updates
CREATE OR REPLACE FUNCTION public.fn_notify_block_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_hash VARCHAR(64);
    old_hash VARCHAR(64);
    edge_function_url TEXT;
    service_role_key TEXT;
    workspace_id UUID;
    payload JSONB;
    response_id BIGINT;
BEGIN
    -- Compute hash of new content
    new_hash := public.compute_content_hash(NEW.content);
    
    -- Get old hash if this is an UPDATE
    IF TG_OP = 'UPDATE' THEN
        old_hash := OLD.content_hash;
    ELSE
        old_hash := NULL;
    END IF;
    
    -- Only proceed if content has changed meaningfully
    -- (new hash differs from old hash, or this is a new block)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (old_hash IS NULL OR new_hash != old_hash)) THEN
        -- Update the content_hash column for future comparisons
        NEW.content_hash := new_hash;
        
        -- Reset embedding_updated_at to trigger new embedding generation
        NEW.embedding_updated_at := NULL;
        
        -- Get workspace ID for context (needed for Edge Function)
        SELECT d.workspace_id INTO workspace_id
        FROM public.documents d
        WHERE d.id = NEW.document_id;
        
        -- Get Edge Function URL from environment configuration
        -- First try app.edge_function_process_block_url setting, fallback to default
        edge_function_url := current_setting('app.edge_function_process_block_url', TRUE);
        IF edge_function_url IS NULL THEN
            -- Fallback to default Supabase Edge Function URL pattern
            edge_function_url := 'https://' || current_setting('app.supabase_project_ref', TRUE) || 
                                '.supabase.co/functions/v1/process-block';
        END IF;
        
        -- Get service role key for authentication
        service_role_key := current_setting('app.service_role_key', TRUE);
        
        -- Only proceed if we have both URL and service key
        IF edge_function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
            -- Build payload for Edge Function
            payload := jsonb_build_object(
                'block_id', NEW.id,
                'document_id', NEW.document_id,
                'workspace_id', workspace_id,
                'content', NEW.content,
                'type', NEW.type,
                'content_hash', new_hash,
                'triggered_at', NOW(),
                'operation', TG_OP
            );
            
            -- Make asynchronous HTTP POST request via pg_net
            -- This doesn't block the user's transaction
            SELECT net.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_role_key,
                    'apikey', service_role_key
                ),
                body := payload::text
            ) INTO response_id;
            
            -- Log the async request (optional, for debugging)
            -- INSERT INTO public.async_processing_log (block_id, request_id, status) 
            -- VALUES (NEW.id, response_id, 'pending');
            
        ELSE
            -- Log configuration error
            INSERT INTO public.async_processing_errors (
                block_id, 
                error_message, 
                http_status_code,
                response_body
            ) VALUES (
                NEW.id,
                'Missing Edge Function configuration: URL=' || COALESCE(edge_function_url, 'NULL') || 
                ', ServiceKey=' || CASE WHEN service_role_key IS NULL THEN 'NULL' ELSE 'PRESENT' END,
                NULL,
                NULL
            );
        END IF;
    END IF;
    
    -- Always return NEW to allow the update/insert to proceed
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any unexpected errors but don't fail the transaction
        -- This ensures user edits are saved even if async processing fails
        INSERT INTO public.async_processing_errors (
            block_id, 
            error_message, 
            http_status_code,
            response_body
        ) VALUES (
            NEW.id,
            'Trigger function error: ' || SQLERRM,
            NULL,
            NULL
        );
        
        -- Still return NEW to allow the operation to succeed
        RETURN NEW;
END;
$$;

-- Create the trigger on the blocks table
-- Uses BEFORE trigger to update content_hash before the row is written
DROP TRIGGER IF EXISTS trigger_notify_block_change ON public.blocks;
CREATE TRIGGER trigger_notify_block_change
    BEFORE INSERT OR UPDATE OF content ON public.blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_block_change();

-- Verification queries (commented out - for manual testing)
/*
-- 1. Verify the trigger function exists
SELECT 
    routine_name, 
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'fn_notify_block_change'
    AND routine_schema = 'public';

-- 2. Verify the trigger is attached to blocks table
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'public.blocks'::regclass
    AND tgname = 'trigger_notify_block_change';

-- 3. Test hash computation
SELECT 
    public.compute_content_hash('{"type":"paragraph","content":[{"type":"text","text":"Hello World"}]}'::jsonb) as hash1,
    public.compute_content_hash('{"type":"paragraph","content":[{"type":"text","text":"Hello World!"}]}'::jsonb) as hash2,
    hash1 = hash2 as should_be_false;

-- 4. Check async_processing_errors table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'async_processing_errors'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verify pg_net extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';
*/

-- Migration completion marker
COMMENT ON FUNCTION public.fn_notify_block_change() IS 
'Detects meaningful content changes in blocks and triggers async GraphRAG processing via Edge Function. 
Part of V3.1 Phase 3 Week 7: Asynchronous Triggers implementation.';

COMMENT ON TABLE public.async_processing_errors IS 
'Logs errors from async Edge Function calls for block processing. Used for monitoring and debugging GraphRAG pipeline.';

-- Update project log reference
-- Note: This migration should be followed by:
-- 1. Creating the Edge Function at supabase/functions/process-block/index.ts
-- 2. Setting environment variables: app.edge_function_process_block_url and app.service_role_key
-- 3. Testing with sample block insertions/updates
