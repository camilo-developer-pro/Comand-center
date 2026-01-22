// Hybrid Search Type Definitions for Command Center v3.0

export interface VectorSearchResult {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  content: string;
  similarity_score: number;
  vector_rank: number;
}

export interface VectorSearchWithEntitiesResult extends VectorSearchResult {
  query_entities: string[];
}

export interface GraphSearchResult {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  content: string;
  hop_distance: number;
  path: string[];
  relationship_types: string[];
  graph_rank: number;
}

export interface HybridSearchResult {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  content: string;
  rrf_score: number;
  vector_rank: number | null;
  graph_rank: number | null;
  hop_distance: number | null;
  source: 'vector' | 'graph' | 'both';
}

export interface HybridSearchParams {
  query_text: string;
  query_embedding: number[];
  workspace_id: string;
  vector_limit?: number;
  graph_depth?: number;
  rrf_k?: number;
  final_limit?: number;
}

export interface HybridSearchResponse {
  results: HybridSearchResult[];
  metadata: {
    vector_count: number;
    graph_count: number;
    fusion_count: number;
    execution_time_ms: number;
  };
}