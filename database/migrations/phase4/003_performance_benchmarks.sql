-- ============================================================================
-- Command Center V3.1 - Phase 4: Performance Benchmark Functions
-- Migration: 003_performance_benchmarks
-- ============================================================================

-- ============================================================================
-- BENCHMARK 1: Document Block Retrieval
-- Target: < 50ms for documents with 1000 blocks
-- ============================================================================

CREATE OR REPLACE FUNCTION benchmark_block_retrieval(
    p_document_id UUID,
    p_iterations INT DEFAULT 10
)
RETURNS TABLE (
    iteration INT,
    row_count BIGINT,
    execution_time_ms NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start TIMESTAMP;
    v_end TIMESTAMP;
    v_count BIGINT;
    v_i INT;
BEGIN
    FOR v_i IN 1..p_iterations LOOP
        v_start := clock_timestamp();
        
        SELECT COUNT(*) INTO v_count
        FROM blocks
        WHERE document_id = p_document_id
        ORDER BY sort_order COLLATE "C";
        
        v_end := clock_timestamp();
        
        iteration := v_i;
        row_count := v_count;
        execution_time_ms := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ============================================================================
-- BENCHMARK 2: Vector Similarity Search
-- Target: < 100ms for top-10 similarity across 100k blocks
-- ============================================================================

CREATE OR REPLACE FUNCTION benchmark_vector_search(
    p_workspace_id UUID,
    p_query_embedding vector(1536),
    p_limit INT DEFAULT 10,
    p_iterations INT DEFAULT 10
)
RETURNS TABLE (
    iteration INT,
    row_count BIGINT,
    execution_time_ms NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start TIMESTAMP;
    v_end TIMESTAMP;
    v_count BIGINT;
    v_i INT;
BEGIN
    FOR v_i IN 1..p_iterations LOOP
        v_start := clock_timestamp();
        
        SELECT COUNT(*) INTO v_count
        FROM (
            SELECT b.id
            FROM blocks b
            JOIN documents d ON b.document_id = d.id
            WHERE d.workspace_id = p_workspace_id
            AND b.embedding IS NOT NULL
            ORDER BY b.embedding <=> p_query_embedding
            LIMIT p_limit
        ) sub;
        
        v_end := clock_timestamp();
        
        iteration := v_i;
        row_count := v_count;
        execution_time_ms := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ============================================================================
-- BENCHMARK 3: Hierarchical (ltree) Queries
-- Target: < 20ms for subtree retrieval
-- ============================================================================

CREATE OR REPLACE FUNCTION benchmark_ltree_subtree(
    p_root_path ltree,
    p_iterations INT DEFAULT 10
)
RETURNS TABLE (
    iteration INT,
    row_count BIGINT,
    execution_time_ms NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start TIMESTAMP;
    v_end TIMESTAMP;
    v_count BIGINT;
    v_i INT;
BEGIN
    FOR v_i IN 1..p_iterations LOOP
        v_start := clock_timestamp();
        
        SELECT COUNT(*) INTO v_count
        FROM documents
        WHERE path <@ p_root_path;
        
        v_end := clock_timestamp();
        
        iteration := v_i;
        row_count := v_count;
        execution_time_ms := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ============================================================================
-- BENCHMARK 4: Graph Traversal
-- Target: < 50ms for 2-hop expansion
-- ============================================================================

CREATE OR REPLACE FUNCTION benchmark_graph_traversal(
    p_workspace_id UUID,
    p_source_entity VARCHAR,
    p_max_depth INT DEFAULT 2,
    p_iterations INT DEFAULT 10
)
RETURNS TABLE (
    iteration INT,
    row_count BIGINT,
    execution_time_ms NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start TIMESTAMP;
    v_end TIMESTAMP;
    v_count BIGINT;
    v_i INT;
BEGIN
    FOR v_i IN 1..p_iterations LOOP
        v_start := clock_timestamp();
        
        WITH RECURSIVE graph_walk AS (
            -- Base case
            SELECT 
                source_entity,
                target_entity,
                1 as depth,
                ARRAY[source_entity] as path
            FROM knowledge_graph_edges
            WHERE workspace_id = p_workspace_id
            AND source_entity = p_source_entity
            AND valid_to IS NULL
            
            UNION ALL
            
            -- Recursive case
            SELECT 
                e.source_entity,
                e.target_entity,
                g.depth + 1,
                g.path || e.target_entity
            FROM knowledge_graph_edges e
            JOIN graph_walk g ON e.source_entity = g.target_entity
            WHERE e.workspace_id = p_workspace_id
            AND g.depth < p_max_depth
            AND e.valid_to IS NULL
            AND NOT e.target_entity = ANY(g.path) -- Cycle prevention
        )
        SELECT COUNT(DISTINCT target_entity) INTO v_count FROM graph_walk;
        
        v_end := clock_timestamp();
        
        iteration := v_i;
        row_count := v_count;
        execution_time_ms := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- ============================================================================
-- AGGREGATE BENCHMARK REPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_benchmark_report(p_workspace_id UUID)
RETURNS TABLE (
    benchmark_name TEXT,
    avg_time_ms NUMERIC,
    min_time_ms NUMERIC,
    max_time_ms NUMERIC,
    p95_time_ms NUMERIC,
    status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_document_id UUID;
    v_embedding vector(1536);
    v_root_path ltree;
    v_entity VARCHAR;
BEGIN
    -- Get sample data for benchmarks
    SELECT d.id INTO v_document_id
    FROM documents d
    WHERE d.workspace_id = p_workspace_id
    LIMIT 1;
    
    SELECT b.embedding INTO v_embedding
    FROM blocks b
    JOIN documents d ON b.document_id = d.id
    WHERE d.workspace_id = p_workspace_id
    AND b.embedding IS NOT NULL
    LIMIT 1;
    
    SELECT d.path INTO v_root_path
    FROM documents d
    WHERE d.workspace_id = p_workspace_id
    LIMIT 1;
    
    SELECT source_entity INTO v_entity
    FROM knowledge_graph_edges
    WHERE workspace_id = p_workspace_id
    LIMIT 1;

    -- Block Retrieval Benchmark
    IF v_document_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'Block Retrieval'::TEXT,
            ROUND(AVG(execution_time_ms), 2),
            ROUND(MIN(execution_time_ms), 2),
            ROUND(MAX(execution_time_ms), 2),
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 2),
            CASE 
                WHEN AVG(execution_time_ms) < 50 THEN '✅ PASS'
                ELSE '❌ FAIL (target: <50ms)'
            END
        FROM benchmark_block_retrieval(v_document_id, 10);
    END IF;

    -- Vector Search Benchmark
    IF v_embedding IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'Vector Similarity'::TEXT,
            ROUND(AVG(execution_time_ms), 2),
            ROUND(MIN(execution_time_ms), 2),
            ROUND(MAX(execution_time_ms), 2),
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 2),
            CASE 
                WHEN AVG(execution_time_ms) < 100 THEN '✅ PASS'
                ELSE '❌ FAIL (target: <100ms)'
            END
        FROM benchmark_vector_search(p_workspace_id, v_embedding, 10, 10);
    END IF;

    -- Ltree Subtree Benchmark
    IF v_root_path IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'Ltree Subtree'::TEXT,
            ROUND(AVG(execution_time_ms), 2),
            ROUND(MIN(execution_time_ms), 2),
            ROUND(MAX(execution_time_ms), 2),
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 2),
            CASE 
                WHEN AVG(execution_time_ms) < 20 THEN '✅ PASS'
                ELSE '❌ FAIL (target: <20ms)'
            END
        FROM benchmark_ltree_subtree(v_root_path, 10);
    END IF;

    -- Graph Traversal Benchmark
    IF v_entity IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'Graph Traversal'::TEXT,
            ROUND(AVG(execution_time_ms), 2),
            ROUND(MIN(execution_time_ms), 2),
            ROUND(MAX(execution_time_ms), 2),
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 2),
            CASE 
                WHEN AVG(execution_time_ms) < 50 THEN '✅ PASS'
                ELSE '❌ FAIL (target: <50ms)'
            END
        FROM benchmark_graph_traversal(p_workspace_id, v_entity, 2, 10);
    END IF;
END;
$$;
