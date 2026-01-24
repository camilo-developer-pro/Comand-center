-- Migration 008: Attach Block Change Trigger with Monitoring
-- Phase 3, Week 7: Asynchronous Triggers - Task 7.2
-- 
-- Purpose: Create monitoring infrastructure and attach a simplified trigger
-- to the blocks table that fires on INSERT and UPDATE operations.
-- This complements the existing fn_notify_block_change() implementation
-- by adding monitoring views and optimization indexes.
--
-- This implements the "Task 7.2" specification from the V3.1 Execution Blueprint.
-- It creates a monitoring view for real-time visibility into block processing
-- and attaches a trigger with debounce logic to prevent rapid-fire processing.

-- Enable required extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For SHA-256 hashing
CREATE EXTENSION IF NOT EXISTS "pg_net";   -- For async HTTP calls

-- Create monitoring view for block processing queue
-- This provides real-time visibility into blocks that need processing
-- and their current status (pending, processing, completed, failed)
CREATE OR REPLACE VIEW public.block_processing_queue AS
SELECT 
    b.id AS block_id,
    b.document_id,
    b.type,
    b.content_hash,
    b.embedding_updated_at,
    b.created_at AS block_created_at,
    b.updated_at AS block_updated_at,
    d.workspace_id,
    -- Determine processing status based on timestamps and errors
    CASE 
        WHEN b.embedding_updated_at IS NULL THEN 'pending_embedding'
        WHEN b.embedding_updated_at IS NOT NULL THEN 'embedding_complete'
        ELSE 'unknown'
    END AS embedding_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.async_processing_errors e 
            WHERE e.block_id = b.id AND e.resolved_at IS NULL
        ) THEN 'has_errors'
        ELSE 'no_errors'
    END AS error_status,
    -- Count of unresolved errors for this block
    (
        SELECT COUNT(*) 
        FROM public.async_processing_errors e 
        WHERE e.block_id = b.id AND e.resolved_at IS NULL
    ) AS unresolved_error_count,
    -- Last error message (if any)
    (
        SELECT e.error_message 
        FROM public.async_processing_errors e 
        WHERE e.block_id = b.id 
        ORDER BY e.created_at DESC 
        LIMIT 1
    ) AS last_error_message,
    -- Time since last update (for debounce logic)
    EXTRACT(EPOCH FROM (NOW() - b.updated_at)) AS seconds_since_update
FROM public.blocks b
JOIN public.documents d ON b.document_id = d.id
WHERE b.content_hash IS NOT NULL  -- Only blocks with content
ORDER BY b.updated_at DESC;

-- Add index on content_hash for faster change detection
-- This optimizes the trigger's hash comparison operations
CREATE INDEX IF NOT EXISTS idx_blocks_content_hash 
ON public.blocks(content_hash) 
WHERE content_hash IS NOT NULL;

-- Create a simplified trigger function for Task 7.2
-- This function focuses on the attachment logic and debounce mechanism
-- while leveraging the existing fn_notify_block_change() for core processing
CREATE OR REPLACE FUNCTION public.fn_block_content_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    debounce_threshold INTERVAL := '5 seconds'::INTERVAL;  -- Prevent rapid-fire triggers
    last_update_time TIMESTAMPTZ;
    should_process BOOLEAN := FALSE;
BEGIN
    -- Determine if we should process this change
    -- For INSERT operations, always process (new content)
    -- For UPDATE operations, only process if content actually changed
    IF TG_OP = 'INSERT' THEN
        should_process := TRUE;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if content actually changed (using content_hash comparison)
        IF OLD.content_hash IS NULL OR
           NEW.content_hash IS NULL OR
           OLD.content_hash != NEW.content_hash OR
           (OLD.content_hash IS DISTINCT FROM NEW.content_hash) THEN
            should_process := TRUE;
        END IF;
    END IF;
    
    -- If no content change, just update timestamp and return
    IF NOT should_process THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;
    
    -- Check if this is a rapid update (within debounce threshold)
    -- This prevents excessive processing for rapid typing or bulk operations
    IF TG_OP = 'UPDATE' THEN
        -- Get the original updated_at before our trigger modifies it
        last_update_time := OLD.updated_at;
        
        -- If this update is happening too soon after the last one, skip processing
        -- but still allow the update to proceed
        IF last_update_time IS NOT NULL AND
           (NOW() - last_update_time) < debounce_threshold THEN
            -- Update the timestamp but skip async processing
            NEW.updated_at := NOW();
            RETURN NEW;
        END IF;
    END IF;
    
    -- For new blocks or updates outside debounce window, call the main processing function
    -- This delegates to the existing fn_notify_block_change() implementation
    PERFORM public.fn_notify_block_change();
    
    -- Always return NEW to allow the operation to proceed
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log trigger attachment errors but don't fail the transaction
        INSERT INTO public.async_processing_errors (
            block_id,
            error_message,
            http_status_code,
            response_body
        ) VALUES (
            COALESCE(NEW.id, OLD.id),
            'Trigger attachment error in fn_block_content_changed: ' || SQLERRM,
            NULL,
            NULL
        );
        
        -- Still return NEW to allow the operation to succeed
        RETURN NEW;
END;
$$;

-- Create the trigger as specified in Task 7.2
-- Uses BEFORE trigger to allow content_hash mutation
-- The trigger function itself handles the logic for when to process
DROP TRIGGER IF EXISTS trg_block_content_changed ON public.blocks;
CREATE TRIGGER trg_block_content_changed
    BEFORE INSERT OR UPDATE OF content ON public.blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_block_content_changed();

-- Create helper function to manually trigger processing for a block
-- Useful for testing or reprocessing failed blocks
CREATE OR REPLACE FUNCTION public.trigger_block_processing(block_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    block_record RECORD;
    success BOOLEAN := FALSE;
BEGIN
    -- Get the block record
    SELECT * INTO block_record 
    FROM public.blocks 
    WHERE id = block_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Block with ID % not found', block_id;
    END IF;
    
    -- Manually call the trigger function
    -- This simulates an update to trigger processing
    UPDATE public.blocks 
    SET updated_at = NOW()
    WHERE id = block_id;
    
    success := TRUE;
    
    -- Log the manual trigger
    INSERT INTO public.async_processing_errors (
        block_id, 
        error_message, 
        http_status_code,
        response_body
    ) VALUES (
        block_id,
        'Manual processing triggered via trigger_block_processing()',
        NULL,
        NULL
    );
    
    RETURN success;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO public.async_processing_errors (
            block_id, 
            error_message, 
            http_status_code,
            response_body
        ) VALUES (
            block_id,
            'Manual processing failed: ' || SQLERRM,
            NULL,
            NULL
        );
        
        RETURN FALSE;
END;
$$;

-- Create function to clean up old processing errors
-- Automatically resolves errors older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_processing_errors()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resolved_count INTEGER;
BEGIN
    UPDATE public.async_processing_errors
    SET resolved_at = NOW(),
        resolution_notes = 'Automatically resolved by cleanup job (older than 7 days)'
    WHERE resolved_at IS NULL
      AND created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS resolved_count = ROW_COUNT;
    
    RETURN resolved_count;
END;
$$;

-- Migration completion marker
COMMENT ON VIEW public.block_processing_queue IS 
'Real-time monitoring view for block processing status in GraphRAG pipeline.
Shows blocks pending embedding, completed embeddings, and error status.
Part of V3.1 Phase 3 Week 7 Task 7.2: Attach Block Change Trigger.';

COMMENT ON FUNCTION public.fn_block_content_changed() IS 
'Simplified trigger function with debounce logic for block content changes.
Delegates to fn_notify_block_change() for core processing.
Part of V3.1 Phase 3 Week 7 Task 7.2: Attach Block Change Trigger.';

COMMENT ON FUNCTION public.trigger_block_processing(UUID) IS 
'Manual trigger function for reprocessing specific blocks.
Useful for testing or recovering from processing failures.';

COMMENT ON FUNCTION public.cleanup_old_processing_errors() IS 
'Automated cleanup function for old async processing errors.
Resolves errors older than 7 days to keep error table manageable.';
