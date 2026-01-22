import { createClient } from '@supabase/supabase-js';
import type {
  HybridSearchParams,
  HybridSearchResponse,
  HybridSearchResult
} from '@/lib/types/hybrid-search';

export async function searchHybridV3(
  supabase: ReturnType<typeof createClient>,
  params: HybridSearchParams
): Promise<HybridSearchResponse> {
  const startTime = performance.now();

  const {
    query_text,
    query_embedding,
    workspace_id,
    vector_limit = 20,
    graph_depth = 2,
    rrf_k = 60,
    final_limit = 25
  } = params;

  // Validate embedding dimensions
  if (query_embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimension: expected 1536, got ${query_embedding.length}`);
  }

  const { data, error } = await supabase.rpc('search_hybrid_v3', {
    p_query_text: query_text,
    p_query_embedding: `[${query_embedding.join(',')}]`,
    p_workspace_id: workspace_id,
    p_vector_limit: vector_limit,
    p_graph_depth: graph_depth,
    p_rrf_k: rrf_k,
    p_final_limit: final_limit
  } as any);

  if (error) {
    throw new Error(`Hybrid search failed: ${error.message}`);
  }

  const results: HybridSearchResult[] = (data as any[] || []).map((row: any) => ({
    entity_id: row.entity_id,
    entity_name: row.entity_name,
    entity_type: row.entity_type,
    content: row.content,
    rrf_score: row.rrf_score,
    vector_rank: row.vector_rank,
    graph_rank: row.graph_rank,
    hop_distance: row.hop_distance,
    source: row.retrieval_source as 'vector' | 'graph' | 'both'
  }));

  const executionTime = performance.now() - startTime;

  return {
    results,
    metadata: {
      vector_count: results.filter(r => r.source === 'vector' || r.source === 'both').length,
      graph_count: results.filter(r => r.source === 'graph' || r.source === 'both').length,
      fusion_count: results.filter(r => r.source === 'both').length,
      execution_time_ms: Math.round(executionTime)
    }
  };
}

// Embedding generation helper (integrates with your embedding service)
export async function generateQueryEmbedding(
  text: string,
  embeddingEndpoint: string
): Promise<number[]> {
  const response = await fetch(embeddingEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model: 'text-embedding-3-small' })
  });

  if (!response.ok) {
    throw new Error(`Embedding generation failed: ${response.statusText}`);
  }

  const { embedding } = await response.json();
  return embedding;
}

// Example usage with embedding generation
export async function searchHybridWithEmbedding(
  supabase: ReturnType<typeof createClient>,
  params: Omit<HybridSearchParams, 'query_embedding'> & { embeddingEndpoint: string }
): Promise<HybridSearchResponse> {
  const { query_text, embeddingEndpoint, ...searchParams } = params;

  // Generate embedding
  const query_embedding = await generateQueryEmbedding(query_text, embeddingEndpoint);

  // Execute hybrid search
  return searchHybridV3(supabase, {
    ...searchParams,
    query_text,
    query_embedding
  });
}