-- Verification script for graph expansion component (016_graph_expansion_component.sql)

-- Test search_graph_expansion_v3 function exists
DO $$
DECLARE
    function_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'semantic_memory'
          AND routine_name = 'search_graph_expansion_v3'
    ) INTO function_exists;

    IF NOT function_exists THEN
        RAISE EXCEPTION 'search_graph_expansion_v3 function missing';
    END IF;

    RAISE NOTICE '✓ search_graph_expansion_v3 function exists';
END;
$$;

-- Test graph_expansion_stats view exists
DO $$
DECLARE
    view_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'semantic_memory'
          AND table_name = 'graph_expansion_stats'
    ) INTO view_exists;

    IF NOT view_exists THEN
        RAISE EXCEPTION 'graph_expansion_stats view missing';
    END IF;

    RAISE NOTICE '✓ graph_expansion_stats view exists';
END;
$$;

-- Check workspace and entity availability for testing
DO $$
DECLARE
    workspace_count INTEGER := 0;
    entity_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO workspace_count FROM workspaces;
    SELECT COUNT(*) INTO entity_count FROM semantic_memory.entities WHERE is_active = true;

    RAISE NOTICE 'Available workspaces: %, Active entities: %', workspace_count, entity_count;

    IF workspace_count = 0 OR entity_count = 0 THEN
        RAISE NOTICE 'Limited testing possible - need workspaces and entities for full validation';
    ELSE
        RAISE NOTICE 'Full testing possible with available data';
    END IF;
END;
$$;

-- Show function definition for verification
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'semantic_memory'
  AND routine_name = 'search_graph_expansion_v3';

-- Show view definition
SELECT
    view_definition
FROM information_schema.views
WHERE table_schema = 'semantic_memory'
  AND table_name = 'graph_expansion_stats';