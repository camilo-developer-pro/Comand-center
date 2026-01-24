import { createClient } from '@supabase/supabase-js';

// Type for Supabase client (compatible with both browser and server clients)
// Using a more flexible type to work with both createClient and createServerSupabaseClient
type SupabaseClient = any;

// ============================================================================
// Type Definitions for Semantic Search
// ============================================================================

export interface SemanticSearchResult {
  block_id: string;
  document_id: string;
  content: any; // JSONB content from TipTap
  block_type: string;
  similarity: number; // 1 - cosine distance (higher = more similar)
  document_title: string;
}

export interface SemanticSearchParams {
  workspace_id: string;
  query_embedding: number[];
  limit?: number;
  similarity_threshold?: number;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  metadata: {
    execution_time_ms: number;
    total_results: number;
    average_similarity: number;
  };
}

export interface EmbeddingStats {
  total_blocks: number;
  embedded_blocks: number;
  pending_blocks: number;
  stale_blocks: number;
  coverage_percent: number;
}

export interface EmbeddingHealth {
  workspace_id: string;
  workspace_name: string;
  total_blocks: number;
  embedded_blocks: number;
  pending_blocks: number;
  stale_blocks: number;
  coverage_percent: number;
  last_embedding_update: string | null;
}

export interface QueueStaleEmbeddingsParams {
  workspace_id: string;
  limit?: number;
}

export interface QueueStaleEmbeddingsResponse {
  queued_count: number;
  workspace_id: string;
  timestamp: string;
}

// ============================================================================
// Core Semantic Search Functions
// ============================================================================

/**
 * Perform semantic similarity search on blocks within a workspace
 * Uses the PostgreSQL function search_blocks_semantic with HNSW index
 */
export async function searchBlocksSemantic(
  supabase: ReturnType<typeof createClient>,
  params: SemanticSearchParams
): Promise<SemanticSearchResponse> {
  const startTime = performance.now();

  const {
    workspace_id,
    query_embedding,
    limit = 10,
    similarity_threshold = 0.7
  } = params;

  // Validate embedding dimensions (1536 for OpenAI text-embedding-3-small)
  if (query_embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimension: expected 1536, got ${query_embedding.length}`);
  }

  const { data, error } = await supabase.rpc('search_blocks_semantic', {
    p_workspace_id: workspace_id,
    p_query_embedding: `[${query_embedding.join(',')}]`,
    p_limit: limit,
    p_similarity_threshold: similarity_threshold
  } as any);

  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }

  const results: SemanticSearchResult[] = (data as any[] || []).map((row: any) => ({
    block_id: row.block_id,
    document_id: row.document_id,
    content: row.content,
    block_type: row.block_type,
    similarity: parseFloat(row.similarity),
    document_title: row.document_title
  }));

  const executionTime = performance.now() - startTime;
  const averageSimilarity = results.length > 0 
    ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
    : 0;

  return {
    results,
    metadata: {
      execution_time_ms: Math.round(executionTime),
      total_results: results.length,
      average_similarity: parseFloat(averageSimilarity.toFixed(4))
    }
  };
}

/**
 * Get embedding statistics for a workspace
 * Shows coverage, pending blocks, and stale embeddings
 */
export async function getEmbeddingStats(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string
): Promise<EmbeddingStats> {
  const { data, error } = await supabase.rpc('get_embedding_stats', {
    p_workspace_id: workspace_id
  } as any);

  if (error) {
    throw new Error(`Failed to get embedding stats: ${error.message}`);
  }

  // Handle the data with proper type assertions
  const resultData = data as any;
  if (!resultData || (Array.isArray(resultData) && resultData.length === 0)) {
    return {
      total_blocks: 0,
      embedded_blocks: 0,
      pending_blocks: 0,
      stale_blocks: 0,
      coverage_percent: 0
    };
  }

  // Handle both array and single object responses
  const stats = Array.isArray(resultData) ? resultData[0] : resultData;
  return {
    total_blocks: Number(stats.total_blocks || 0),
    embedded_blocks: Number(stats.embedded_blocks || 0),
    pending_blocks: Number(stats.pending_blocks || 0),
    stale_blocks: Number(stats.stale_blocks || 0),
    coverage_percent: parseFloat(stats.coverage_percent || 0)
  };
}

/**
 * Queue stale embeddings for reprocessing via Edge Function
 * Returns the number of blocks queued for embedding generation
 */
export async function queueStaleEmbeddings(
  supabase: ReturnType<typeof createClient>,
  params: QueueStaleEmbeddingsParams
): Promise<QueueStaleEmbeddingsResponse> {
  const { workspace_id, limit = 100 } = params;

  const { data, error } = await supabase.rpc('queue_stale_embeddings', {
    p_workspace_id: workspace_id,
    p_limit: limit
  } as any);

  if (error) {
    throw new Error(`Failed to queue stale embeddings: ${error.message}`);
  }

  return {
    queued_count: Number(data) || 0,
    workspace_id,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get embedding health view data for all workspaces or specific workspace
 */
export async function getEmbeddingHealth(
  supabase: ReturnType<typeof createClient>,
  workspace_id?: string
): Promise<EmbeddingHealth[]> {
  let query = supabase
    .from('embedding_health')
    .select('*');

  if (workspace_id) {
    query = query.eq('workspace_id', workspace_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get embedding health: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    workspace_id: row.workspace_id,
    workspace_name: row.workspace_name,
    total_blocks: Number(row.total_blocks),
    embedded_blocks: Number(row.embedded_blocks),
    pending_blocks: Number(row.pending_blocks),
    stale_blocks: Number(row.stale_blocks),
    coverage_percent: parseFloat(row.coverage_percent),
    last_embedding_update: row.last_embedding_update
  }));
}

// ============================================================================
// Embedding Generation Utilities
// ============================================================================

/**
 * Generate embedding for text using OpenAI's text-embedding-3-small model
 * This is a client-side helper that can be used to generate embeddings for queries
 */
export async function generateEmbedding(
  text: string,
  apiKey: string,
  model: string = 'text-embedding-3-small'
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      input: text,
      model: model,
      dimensions: 1536
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI embedding generation failed: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}

/**
 * Semantic search with automatic embedding generation
 * Combines embedding generation and semantic search in one call
 */
export async function semanticSearchWithText(
  supabase: ReturnType<typeof createClient>,
  params: Omit<SemanticSearchParams, 'query_embedding'> & {
    query_text: string;
    openai_api_key: string;
  }
): Promise<SemanticSearchResponse> {
  const { query_text, openai_api_key, ...searchParams } = params;

  // Generate embedding for the query text
  const query_embedding = await generateEmbedding(query_text, openai_api_key);

  // Execute semantic search with the generated embedding
  return searchBlocksSemantic(supabase, {
    ...searchParams,
    query_embedding
  });
}

// ============================================================================
// Helper Functions for Monitoring and Debugging
// ============================================================================

/**
 * Check if HNSW index exists by attempting a semantic search
 * This is a practical check that verifies the index is functional
 */
export async function checkHNSWIndexStatus(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string
): Promise<{
  exists: boolean;
  functional: boolean;
  test_query_time_ms: number | null;
}> {
  const startTime = performance.now();
  
  try {
    // Try a simple semantic search with a dummy embedding
    // This will fail if the HNSW index doesn't exist or isn't functional
    const dummyEmbedding = new Array(1536).fill(0);
    
    const { error } = await supabase.rpc('search_blocks_semantic', {
      p_workspace_id: workspace_id,
      p_query_embedding: `[${dummyEmbedding.join(',')}]`,
      p_limit: 1,
      p_similarity_threshold: 0.1
    } as any);

    const queryTime = performance.now() - startTime;
    
    if (error) {
      // Check if error is related to missing index
      const errorMessage = error.message.toLowerCase();
      const isIndexError = errorMessage.includes('index') ||
                          errorMessage.includes('hnsw') ||
                          errorMessage.includes('vector');
      
      return {
        exists: !isIndexError, // If error is not index-related, index might exist but have other issues
        functional: false,
        test_query_time_ms: null
      };
    }

    return {
      exists: true,
      functional: true,
      test_query_time_ms: Math.round(queryTime)
    };
  } catch (error) {
    return {
      exists: false,
      functional: false,
      test_query_time_ms: null
    };
  }
}

/**
 * Get embedding processing queue status
 * Shows blocks pending embedding generation
 */
export async function getEmbeddingQueueStatus(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string
): Promise<{
  pending_count: number;
  stale_count: number;
  last_processed: string | null;
}> {
  const stats = await getEmbeddingStats(supabase, workspace_id);
  
  // Get the most recent embedding update time
  const health = await getEmbeddingHealth(supabase, workspace_id);
  const last_processed = health.length > 0 ? health[0].last_embedding_update : null;

  return {
    pending_count: stats.pending_blocks,
    stale_count: stats.stale_blocks,
    last_processed
  };
}