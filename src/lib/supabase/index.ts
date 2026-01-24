// Supabase Client Exports
export { createClient } from '@supabase/supabase-js';

// Core Client Utilities
export * from './client';
export * from './server';
export * from './middleware';
export * from './admin';

// Search & Semantic Functions
export * from './hybrid-search';
export * from './semantic-search';

// Re-export semantic search types for convenience
export type {
  SemanticSearchResult,
  SemanticSearchParams,
  SemanticSearchResponse,
  EmbeddingStats,
  EmbeddingHealth,
  QueueStaleEmbeddingsParams,
  QueueStaleEmbeddingsResponse
} from './semantic-search';

// Note: Hybrid search types are imported from '@/lib/types/hybrid-search'
// in the hybrid-search.ts file, so they're not exported from here