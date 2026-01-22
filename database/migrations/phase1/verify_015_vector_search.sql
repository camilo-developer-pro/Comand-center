-- Verification script for vector search component (015_vector_search_component.sql)

-- Test search_vector_v3 function exists
DO $$
DECLARE
    function_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'semantic_memory'
          AND routine_name = 'search_vector_v3'
    ) INTO function_exists;

    IF NOT function_exists THEN
        RAISE EXCEPTION 'search_vector_v3 function missing';
    END IF;

    RAISE NOTICE '✓ search_vector_v3 function exists';
END;
$$;

-- Test search_vector_v3_text function exists
DO $$
DECLARE
    function_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'semantic_memory'
          AND routine_name = 'search_vector_v3_text'
    ) INTO function_exists;

    IF NOT function_exists THEN
        RAISE EXCEPTION 'search_vector_v3_text function missing';
    END IF;

    RAISE NOTICE '✓ search_vector_v3_text function exists';
END;
$$;

-- Verify workspace isolation and function signatures
DO $$
DECLARE
    workspace_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO workspace_count FROM workspaces;
    RAISE NOTICE 'Available workspaces for testing: %', workspace_count;

    IF workspace_count = 0 THEN
        RAISE NOTICE 'No workspaces available - functions will require workspace_id parameter validation';
    ELSE
        RAISE NOTICE 'Functions ready for workspace-scoped vector search testing';
    END IF;
END;
$$;

-- Show function definitions for verification
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'semantic_memory'
  AND routine_name IN ('search_vector_v3', 'search_vector_v3_text')
ORDER BY routine_name;