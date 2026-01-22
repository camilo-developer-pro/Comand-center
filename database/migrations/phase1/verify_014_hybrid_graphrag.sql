-- Verification script for hybrid GraphRAG indexes migration (014_hybrid_graphrag_indexes.sql)

-- Check if required columns were added to entities table
DO $$
DECLARE
    workspace_id_exists BOOLEAN := FALSE;
    is_active_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'semantic_memory'
          AND table_name = 'entities'
          AND column_name = 'workspace_id'
    ) INTO workspace_id_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'semantic_memory'
          AND table_name = 'entities'
          AND column_name = 'is_active'
    ) INTO is_active_exists;

    IF NOT workspace_id_exists THEN
        RAISE EXCEPTION 'workspace_id column missing from semantic_memory.entities';
    END IF;

    IF NOT is_active_exists THEN
        RAISE EXCEPTION 'is_active column missing from semantic_memory.entities';
    END IF;

    RAISE NOTICE '✓ Columns workspace_id and is_active exist in semantic_memory.entities';
END;
$$;

-- Check if traversal_priority and is_active columns were added to entity_relationships
DO $$
DECLARE
    traversal_priority_exists BOOLEAN := FALSE;
    is_active_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'semantic_memory'
          AND table_name = 'entity_relationships'
          AND column_name = 'traversal_priority'
    ) INTO traversal_priority_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'semantic_memory'
          AND table_name = 'entity_relationships'
          AND column_name = 'is_active'
    ) INTO is_active_exists;

    IF NOT traversal_priority_exists THEN
        RAISE EXCEPTION 'traversal_priority column missing from semantic_memory.entity_relationships';
    END IF;

    IF NOT is_active_exists THEN
        RAISE EXCEPTION 'is_active column missing from semantic_memory.entity_relationships';
    END IF;

    RAISE NOTICE '✓ Columns traversal_priority and is_active exist in semantic_memory.entity_relationships';
END;
$$;

-- Verify indexes exist
DO $$
DECLARE
    hnsw_index_exists BOOLEAN := FALSE;
    workspace_embedding_index_exists BOOLEAN := FALSE;
    source_target_index_exists BOOLEAN := FALSE;
    target_source_index_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'semantic_memory'
          AND tablename = 'entities'
          AND indexname = 'idx_entities_embedding_hnsw_partial'
    ) INTO hnsw_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'semantic_memory'
          AND tablename = 'entities'
          AND indexname = 'idx_entities_workspace_embedding'
    ) INTO workspace_embedding_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'semantic_memory'
          AND tablename = 'entity_relationships'
          AND indexname = 'idx_relationships_source_target'
    ) INTO source_target_index_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'semantic_memory'
          AND tablename = 'entity_relationships'
          AND indexname = 'idx_relationships_target_source'
    ) INTO target_source_index_exists;

    IF NOT hnsw_index_exists THEN
        RAISE EXCEPTION 'Partial HNSW index idx_entities_embedding_hnsw_partial missing';
    END IF;

    IF NOT workspace_embedding_index_exists THEN
        RAISE EXCEPTION 'Composite index idx_entities_workspace_embedding missing';
    END IF;

    IF NOT source_target_index_exists THEN
        RAISE EXCEPTION 'Relationship index idx_relationships_source_target missing';
    END IF;

    IF NOT target_source_index_exists THEN
        RAISE EXCEPTION 'Relationship index idx_relationships_target_source missing';
    END IF;

    RAISE NOTICE '✓ All required indexes exist';
END;
$$;

-- Verify extract_query_entities function exists
DO $$
DECLARE
    function_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'semantic_memory'
          AND routine_name = 'extract_query_entities'
    ) INTO function_exists;

    IF NOT function_exists THEN
        RAISE EXCEPTION 'extract_query_entities function missing';
    END IF;

    RAISE NOTICE '✓ Function extract_query_entities exists';
END;
$$;

-- Show all semantic_memory indexes for verification
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'semantic_memory'
ORDER BY indexname;

-- Show all semantic_memory functions
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'semantic_memory'
ORDER BY routine_name;