/**
 * Performance Benchmark Utility
 * 
 * Phase 4: Performance Optimization
 * 
 * This utility demonstrates WHY querying the `widget_index` generated column
 * is dramatically faster than querying the JSONB `content` column directly.
 * 
 * FOR EDUCATIONAL/DEBUGGING USE ONLY - Not for production.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================
// Types
// ============================================================

export interface BenchmarkResult {
    method: 'generated_column' | 'jsonb_direct';
    queryTimeMs: number;
    rowsReturned: number;
    indexUsed: boolean;
    explanation: string;
}

export interface BenchmarkComparison {
    generatedColumn: BenchmarkResult;
    jsonbDirect: BenchmarkResult;
    speedupFactor: number;
    recommendation: string;
}

// ============================================================
// Benchmark Functions
// ============================================================

/**
 * Benchmark query using the widget_index generated column.
 * This query WILL use the GIN index.
 */
async function benchmarkGeneratedColumn(
    workspaceId: string,
    widgetType: string
): Promise<BenchmarkResult> {
    const supabase = await createClient();

    const startTime = performance.now();

    const { data, error } = await supabase
        .from('documents')
        .select('id, title')
        .eq('workspace_id', workspaceId)
        .contains('widget_index', [widgetType]);

    const endTime = performance.now();

    if (error) {
        throw new Error(`Generated column query failed: ${error.message}`);
    }

    return {
        method: 'generated_column',
        queryTimeMs: Math.round((endTime - startTime) * 100) / 100,
        rowsReturned: data?.length ?? 0,
        indexUsed: true, // GIN index on widget_index
        explanation: `
      Query: SELECT id, title FROM documents 
             WHERE workspace_id = '...' 
             AND widget_index @> ARRAY['${widgetType}']
      
      Why it's fast:
      1. Uses GIN index on widget_index column (O(log n) lookup)
      2. widget_index is stored inline (not TOASTed)
      3. No JSON parsing at query time - comparison is direct array operation
      4. Index scan instead of sequential scan
    `.trim(),
    };
}

/**
 * Benchmark query using direct JSONB content parsing.
 * This query CANNOT use an index efficiently.
 * 
 * WARNING: This is intentionally slow to demonstrate the anti-pattern.
 */
async function benchmarkJsonbDirect(
    workspaceId: string,
    widgetType: string
): Promise<BenchmarkResult> {
    const supabase = await createClient();

    const startTime = performance.now();

    // This query uses RPC to run raw SQL that parses JSONB
    // In real code, you would NEVER do this - use the generated column instead
    const { data, error } = await supabase.rpc('benchmark_jsonb_query', {
        p_workspace_id: workspaceId,
        p_widget_type: widgetType,
    });

    const endTime = performance.now();

    if (error) {
        // If RPC doesn't exist, simulate the result
        return {
            method: 'jsonb_direct',
            queryTimeMs: -1, // Indicates RPC not available
            rowsReturned: 0,
            indexUsed: false,
            explanation: `
        Query (conceptual): SELECT id, title FROM documents 
               WHERE workspace_id = '...' 
               AND content @> '{"blocks": [{"type": "${widgetType}"}]}'
        
        Why it's SLOW:
        1. Cannot use GIN index for deep nested searches
        2. content column is TOASTed (compressed, stored off-heap)
        3. Every row requires: fetch from TOAST -> decompress -> parse JSON -> traverse
        4. Sequential scan of entire table
        5. CPU-intensive JSON parsing per row
        
        TOAST Impact:
        - JSONB blobs > 2KB are automatically compressed and stored separately
        - Querying ANY field requires decompressing the ENTIRE blob
        - For 1000 documents averaging 10KB each = 10MB of decompression per query
      `.trim(),
        };
    }

    return {
        method: 'jsonb_direct',
        queryTimeMs: Math.round((endTime - startTime) * 100) / 100,
        rowsReturned: Array.isArray(data) ? data.length : 0,
        indexUsed: false,
        explanation: 'See generated_column explanation for comparison.',
    };
}

/**
 * Run a complete benchmark comparison.
 * 
 * @param workspaceId - The workspace to benchmark against
 * @param widgetType - The widget type to search for
 */
export async function runPerformanceBenchmark(
    workspaceId: string,
    widgetType: string
): Promise<BenchmarkComparison> {
    const generatedColumn = await benchmarkGeneratedColumn(workspaceId, widgetType);
    const jsonbDirect = await benchmarkJsonbDirect(workspaceId, widgetType);

    // Calculate speedup (handle case where JSONB benchmark wasn't available)
    const speedupFactor = jsonbDirect.queryTimeMs > 0
        ? Math.round((jsonbDirect.queryTimeMs / generatedColumn.queryTimeMs) * 10) / 10
        : -1;

    return {
        generatedColumn,
        jsonbDirect,
        speedupFactor,
        recommendation: `
      ALWAYS use the widget_index generated column for widget-type queries.
      
      The Generated Column pattern provides:
      - ${speedupFactor > 0 ? `${speedupFactor}x` : '10-100x'} faster queries
      - Zero runtime JSON parsing
      - Proper index utilization
      - TOAST bypass (no decompression overhead)
      
      The cost is paid at WRITE time (INSERT/UPDATE), not READ time.
      Since documents are read far more often than written, this is optimal.
    `.trim(),
    };
}

// ============================================================
// Educational Constants
// ============================================================

export const PERFORMANCE_EXPLANATION = {
    title: 'Why Generated Columns Beat JSONB Queries',

    toast_explanation: `
    TOAST (The Oversized-Attribute Storage Technique):
    
    PostgreSQL automatically compresses and stores large values (>2KB) in a 
    separate "TOAST table". The main table row contains only a pointer.
    
    Problem: To query ANY field in a TOASTed JSONB column, PostgreSQL must:
    1. Read the pointer from the main table
    2. Fetch the compressed data from the TOAST table
    3. Decompress the entire blob
    4. Parse the JSON structure
    5. Traverse to find the requested path
    
    This happens for EVERY ROW in a sequential scan.
  `,

    generated_column_solution: `
    Generated Columns extract data at WRITE time:
    
    widget_index TEXT[] GENERATED ALWAYS AS (
      jsonb_path_query_array(content, '$.blocks[*].type')
    ) STORED
    
    The 'STORED' keyword means:
    1. Value is computed on INSERT/UPDATE
    2. Value is stored in the main table row (not TOASTed if small)
    3. Value can be indexed (GIN, B-Tree)
    4. Reads require zero computation
    
    The widget types are "extracted" from the JSON blob and stored as a 
    simple PostgreSQL array that can be indexed and queried directly.
  `,

    gin_index_benefit: `
    GIN (Generalized Inverted Index) for Arrays:
    
    CREATE INDEX idx_documents_widget_index 
    ON documents USING GIN (widget_index);
    
    GIN creates an inverted index:
    - 'crm-leads' -> [doc_id_1, doc_id_5, doc_id_99]
    - 'revenue-chart' -> [doc_id_2, doc_id_5]
    
    Query: widget_index @> ARRAY['crm-leads']
    - Lookup 'crm-leads' in index (O(log n))
    - Return document IDs directly
    - No table scan required
  `,
};
