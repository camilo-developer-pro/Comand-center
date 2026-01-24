-- ============================================================================
-- Command Center V3.1 - Phase 3: Knowledge Graph Upsert Functions
-- Migration: 009_knowledge_graph_upsert.sql
-- Description: Create robust PostgreSQL functions for upserting knowledge graph edges
--              with bi-temporal tracking and conflict resolution.
-- ============================================================================

-- ============================================================================
-- FUNCTION: upsert_knowledge_graph_edge
-- ============================================================================
-- Upserts a single knowledge graph edge with bi-temporal tracking and duplicate detection.
-- Uses FOR UPDATE locking for concurrent safety.
-- Returns the ID of the upserted edge.
CREATE OR REPLACE FUNCTION public.upsert_knowledge_graph_edge(
    p_workspace_id UUID,
    p_source_entity VARCHAR(500),
    p_source_entity_type VARCHAR(100),
    p_relationship VARCHAR(200),
    p_target_entity VARCHAR(500),
    p_target_entity_type VARCHAR(100),
    p_source_block_id UUID DEFAULT NULL,
    p_confidence DECIMAL(3,2) DEFAULT 1.0,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_valid_from TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_edge_id UUID;
    new_edge_id UUID;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Validate confidence score
    IF p_confidence < 0 OR p_confidence > 1 THEN
        RAISE EXCEPTION 'Confidence score must be between 0 and 1';
    END IF;

    -- Check for existing active edge with same entities and relationship
    -- Use FOR UPDATE to prevent concurrent inserts of the same edge
    SELECT id INTO existing_edge_id
    FROM public.knowledge_graph_edges
    WHERE workspace_id = p_workspace_id
      AND source_entity = p_source_entity
      AND target_entity = p_target_entity
      AND relationship = p_relationship
      AND valid_to IS NULL
    FOR UPDATE;

    IF existing_edge_id IS NOT NULL THEN
        -- Update existing edge with higher confidence and new metadata
        UPDATE public.knowledge_graph_edges
        SET 
            confidence = GREATEST(confidence, p_confidence),
            metadata = p_metadata,
            source_block_id = COALESCE(p_source_block_id, source_block_id),
            updated_at = current_time
        WHERE id = existing_edge_id
        RETURNING id INTO new_edge_id;

        -- Notify about edge update
        PERFORM pg_notify(
            'graph_edge_updated',
            json_build_object(
                'edge_id', new_edge_id,
                'workspace_id', p_workspace_id,
                'operation', 'update',
                'timestamp', current_time
            )::text
        );

        RETURN new_edge_id;
    ELSE
        -- Insert new edge
        INSERT INTO public.knowledge_graph_edges (
            workspace_id,
            source_entity,
            source_entity_type,
            relationship,
            target_entity,
            target_entity_type,
            source_block_id,
            confidence,
            metadata,
            valid_from,
            created_at,
            updated_at
        ) VALUES (
            p_workspace_id,
            p_source_entity,
            p_source_entity_type,
            p_relationship,
            p_target_entity,
            p_target_entity_type,
            p_source_block_id,
            p_confidence,
            p_metadata,
            COALESCE(p_valid_from, current_time),
            current_time,
            current_time
        )
        RETURNING id INTO new_edge_id;

        -- Notify about new edge creation
        PERFORM pg_notify(
            'graph_edge_created',
            json_build_object(
                'edge_id', new_edge_id,
                'workspace_id', p_workspace_id,
                'source_entity', p_source_entity,
                'target_entity', p_target_entity,
                'relationship', p_relationship,
                'timestamp', current_time
            )::text
        );

        RETURN new_edge_id;
    END IF;
END;
$$;

-- ============================================================================
-- FUNCTION: invalidate_block_edges
-- ============================================================================
-- Soft-invalidates all edges from a specific block by setting valid_to timestamp.
-- This implements the bi-temporal pattern for edge lifecycle management.
CREATE OR REPLACE FUNCTION public.invalidate_block_edges(
    p_source_block_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invalidated_count INTEGER;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Update all active edges from this block
    UPDATE public.knowledge_graph_edges
    SET 
        valid_to = current_time,
        updated_at = current_time
    WHERE source_block_id = p_source_block_id
      AND valid_to IS NULL
    RETURNING COUNT(*) INTO invalidated_count;

    -- Notify about invalidation
    IF invalidated_count > 0 THEN
        PERFORM pg_notify(
            'graph_edges_invalidated',
            json_build_object(
                'source_block_id', p_source_block_id,
                'count', invalidated_count,
                'timestamp', current_time
            )::text
        );
    END IF;

    RETURN invalidated_count;
END;
$$;

-- ============================================================================
-- FUNCTION: upsert_knowledge_graph_edges_batch
-- ============================================================================
-- Batch upsert function for Edge Function integration.
-- Accepts a JSONB array of edges, invalidates old edges from the source block,
-- and upserts new edges in a single transaction.
CREATE OR REPLACE FUNCTION public.upsert_knowledge_graph_edges_batch(
    p_workspace_id UUID,
    p_source_block_id UUID,
    p_edges JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    edge_record JSONB;
    edge_id UUID;
    inserted_count INTEGER := 0;
    updated_count INTEGER := 0;
    invalidated_count INTEGER;
    results JSONB := '[]'::JSONB;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Validate input
    IF p_edges IS NULL OR jsonb_array_length(p_edges) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No edges to process',
            'inserted_count', 0,
            'updated_count', 0,
            'invalidated_count', 0,
            'results', '[]'::JSONB
        );
    END IF;

    -- Start transaction
    BEGIN
        -- First, invalidate existing edges from this block
        invalidated_count := public.invalidate_block_edges(p_source_block_id);

        -- Process each edge in the batch
        FOR edge_record IN SELECT * FROM jsonb_array_elements(p_edges)
        LOOP
            -- Extract edge data from JSON
            edge_id := public.upsert_knowledge_graph_edge(
                p_workspace_id,
                edge_record->>'source_entity',
                edge_record->>'source_entity_type',
                edge_record->>'relationship',
                edge_record->>'target_entity',
                edge_record->>'target_entity_type',
                p_source_block_id,
                (edge_record->>'confidence')::DECIMAL(3,2),
                COALESCE(edge_record->'metadata', '{}'::JSONB),
                current_time
            );

            -- Track results
            results := results || jsonb_build_object(
                'edge_id', edge_id,
                'source_entity', edge_record->>'source_entity',
                'target_entity', edge_record->>'target_entity',
                'relationship', edge_record->>'relationship',
                'success', true
            );

            -- Count operations
            IF edge_record->>'operation' = 'update' THEN
                updated_count := updated_count + 1;
            ELSE
                inserted_count := inserted_count + 1;
            END IF;
        END LOOP;

        -- Return comprehensive result
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Batch upsert completed',
            'inserted_count', inserted_count,
            'updated_count', updated_count,
            'invalidated_count', invalidated_count,
            'total_processed', inserted_count + updated_count,
            'results', results,
            'timestamp', current_time
        );

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback is automatic on error
            RAISE EXCEPTION 'Batch upsert failed: %', SQLERRM;
    END;
END;
$$;

-- ============================================================================
-- CREATE COMPOSITE INDEX FOR PERFORMANCE
-- ============================================================================
-- Create composite index for efficient duplicate detection and workspace queries
CREATE INDEX IF NOT EXISTS idx_kg_edges_workspace_entities_relationship 
ON public.knowledge_graph_edges (
    workspace_id, 
    source_entity, 
    target_entity, 
    relationship
) WHERE valid_to IS NULL;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_knowledge_graph_edge TO authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_block_edges TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_knowledge_graph_edges_batch TO authenticated;

-- ============================================================================
-- MIGRATION VERIFICATION COMMENT
-- ============================================================================
-- To verify this migration, run the verification script:
-- database/migrations/phase3/verify_009_knowledge_graph.sql