-- Verification script for search_hybrid_v3 function (017_search_hybrid_v3.sql)

-- Test search_hybrid_v3 function exists
DO $$
DECLARE
    function_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'semantic_memory'
          AND routine_name = 'search_hybrid_v3'
    ) INTO function_exists;

    IF NOT function_exists THEN
        RAISE EXCEPTION 'search_hybrid_v3 function missing';
    END IF;

    RAISE NOTICE '✓ search_hybrid_v3 function exists';
END;
$$;

-- Test workspace availability
DO $$
DECLARE
    workspace_count INTEGER := 0;
    entity_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO workspace_count FROM workspaces;
    SELECT COUNT(*) INTO entity_count FROM semantic_memory.entities WHERE is_active = true;

    RAISE NOTICE 'Available workspaces: %, Active entities: %', workspace_count, entity_count;

    IF workspace_count = 0 THEN
        RAISE NOTICE 'No workspaces available - hybrid search requires workspace_id';
    ELSIF entity_count = 0 THEN
        RAISE NOTICE 'No active entities - hybrid search will return empty results';
    ELSE
        RAISE NOTICE 'System ready for hybrid search testing';
    END IF;
END;
$$;

-- Show function definition for verification
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'semantic_memory'
  AND routine_name = 'search_hybrid_v3';

-- Test RRF calculation manually
DO $$
DECLARE
    vector_rank INTEGER := 1;
    graph_rank INTEGER := 3;
    rrf_k INTEGER := 60;
    expected_rrf FLOAT;
BEGIN
    -- Manual RRF calculation: 1/(60+1) + 1/(60+3) = 1/61 + 1/63
    expected_rrf := 1.0/61 + 1.0/63;
    RAISE NOTICE 'RRF calculation test: vector_rank=%, graph_rank=%, k=%, expected_rrf≈%',
        vector_rank, graph_rank, rrf_k, round(expected_rrf::numeric, 6);
END;
$$;

RAISE NOTICE 'Hybrid search v3 verification complete!';