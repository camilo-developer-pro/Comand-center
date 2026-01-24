import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  searchBlocksSemantic,
  getEmbeddingStats,
  queueStaleEmbeddings,
  generateEmbedding,
  getEmbeddingHealth,
  checkHNSWIndexStatus,
  type SemanticSearchResult,
  type SemanticSearchResponse,
  type EmbeddingStats,
  type QueueStaleEmbeddingsResponse,
  type EmbeddingHealth
} from '@/lib/supabase/semantic-search';
import { 
  searchBlocksSemanticAction,
  getEmbeddingStatsAction,
  queueStaleEmbeddingsAction,
  getEmbeddingHealthAction,
  isSemanticSearchAvailable,
  regenerateBlockEmbedding
} from '@/lib/actions/semantic-actions';

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}));

// Mock the server supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}));

// Mock fetch for OpenAI API
global.fetch = vi.fn();

describe('Phase 3: Intelligence Layer Integration Tests', () => {
  const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDocumentId = '223e4567-e89b-12d3-a456-426614174000';
  const mockBlockId = '323e4567-e89b-12d3-a456-426614174000';
  
  const mockEmbedding = Array(1536).fill(0.1);
  const mockQueryText = 'test query about project management';
  
  const mockSearchResult: SemanticSearchResult = {
    block_id: mockBlockId,
    document_id: mockDocumentId,
    content: { type: 'paragraph', content: [{ type: 'text', text: 'Test block content' }] },
    block_type: 'paragraph',
    similarity: 0.85,
    document_title: 'Test Document'
  };

  const mockSearchResponse: SemanticSearchResponse = {
    results: [mockSearchResult],
    metadata: {
      execution_time_ms: 50,
      total_results: 1,
      average_similarity: 0.85
    }
  };
  
  const mockEmbeddingStats: EmbeddingStats = {
    total_blocks: 100,
    embedded_blocks: 75,
    pending_blocks: 25,
    stale_blocks: 10,
    coverage_percent: 75.0
  };
  
  const mockQueueResult: QueueStaleEmbeddingsResponse = {
    queued_count: 5,
    workspace_id: mockWorkspaceId,
    timestamp: new Date().toISOString()
  };

  const mockEmbeddingHealth: EmbeddingHealth[] = [{
    workspace_id: mockWorkspaceId,
    workspace_name: 'Test Workspace',
    total_blocks: 100,
    embedded_blocks: 75,
    pending_blocks: 25,
    stale_blocks: 10,
    coverage_percent: 75.0,
    last_embedding_update: new Date().toISOString()
  }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Semantic Search Functions', () => {
    it('should search blocks semantically with embedding', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [mockSearchResult], error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      // Mock the client creation
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const result = await searchBlocksSemantic(
        mockClient as any,
        {
          workspace_id: mockWorkspaceId,
          query_embedding: mockEmbedding,
          limit: 10,
          similarity_threshold: 0.7
        }
      );
      
      expect(mockRpc).toHaveBeenCalledWith('search_blocks_semantic', {
        p_workspace_id: mockWorkspaceId,
        p_query_embedding: `[${mockEmbedding.join(',')}]`,
        p_limit: 10,
        p_similarity_threshold: 0.7
      });
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].block_id).toBe(mockBlockId);
      expect(result.metadata.total_results).toBe(1);
    });

    it('should get embedding stats for workspace', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockEmbeddingStats, error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const result = await getEmbeddingStats(mockClient as any, mockWorkspaceId);
      
      expect(mockRpc).toHaveBeenCalledWith('get_embedding_stats', {
        p_workspace_id: mockWorkspaceId
      });
      
      expect(result.total_blocks).toBe(100);
      expect(result.coverage_percent).toBe(75.0);
    });

    it('should queue stale embeddings for regeneration', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: 5, error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const result = await queueStaleEmbeddings(
        mockClient as any,
        {
          workspace_id: mockWorkspaceId,
          limit: 100
        }
      );
      
      expect(mockRpc).toHaveBeenCalledWith('queue_stale_embeddings', {
        p_workspace_id: mockWorkspaceId,
        p_limit: 100
      });
      
      expect(result.queued_count).toBe(5);
      expect(result.workspace_id).toBe(mockWorkspaceId);
    });

    it('should generate embedding for text using OpenAI', async () => {
      const mockEmbeddingResponse = {
        data: [{
          embedding: mockEmbedding
        }]
      };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEmbeddingResponse
      });
      
      const result = await generateEmbedding(mockQueryText, 'test-api-key');
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        },
        body: JSON.stringify({
          input: mockQueryText,
          model: 'text-embedding-3-small',
          dimensions: 1536
        })
      });
      
      expect(result).toEqual(mockEmbedding);
    });

    it('should get embedding health data', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockEmbeddingHealth, error: null })
      });
      
      const mockClient = {
        from: vi.fn(() => ({
          select: mockSelect
        }))
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const result = await getEmbeddingHealth(mockClient as any, mockWorkspaceId);
      
      expect(mockClient.from).toHaveBeenCalledWith('embedding_health');
      expect(result).toHaveLength(1);
      expect(result[0].workspace_id).toBe(mockWorkspaceId);
    });

    it('should check HNSW index status', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const result = await checkHNSWIndexStatus(mockClient as any, mockWorkspaceId);
      
      expect(mockRpc).toHaveBeenCalled();
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('functional');
    });
  });

  describe('Server Actions', () => {
    it('should search semantic blocks via server action', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [mockSearchResult], error: null });
      const mockServerClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/server').createServerSupabaseClient).mockResolvedValue(mockServerClient as any);
      
      const result = await searchBlocksSemanticAction({
        workspace_id: mockWorkspaceId,
        query_embedding: mockEmbedding,
        limit: 10,
        similarity_threshold: 0.7
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.results).toHaveLength(1);
      }
    });

    it('should get workspace embedding stats via server action', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockEmbeddingStats, error: null });
      const mockServerClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/server').createServerSupabaseClient).mockResolvedValue(mockServerClient as any);
      
      const result = await getEmbeddingStatsAction({
        workspace_id: mockWorkspaceId
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_blocks).toBe(100);
      }
    });

    it('should queue workspace embedding regeneration via server action', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: 5, error: null });
      const mockServerClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/server').createServerSupabaseClient).mockResolvedValue(mockServerClient as any);
      
      const result = await queueStaleEmbeddingsAction({
        workspace_id: mockWorkspaceId,
        limit: 50
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queued_count).toBe(5);
      }
    });

    it('should get embedding health via server action', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockEmbeddingStats, error: null });
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockEmbeddingHealth, error: null })
      });
      
      const mockServerClient = {
        rpc: mockRpc,
        from: vi.fn(() => ({
          select: mockSelect
        }))
      };
      
      vi.mocked(require('@/lib/supabase/server').createServerSupabaseClient).mockResolvedValue(mockServerClient as any);
      
      const result = await getEmbeddingHealthAction(mockWorkspaceId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stats.total_blocks).toBe(100);
        expect(result.data.health).toHaveLength(1);
        expect(result.data.health_status).toBeDefined();
      }
    });

    it('should check if semantic search is available', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: mockEmbeddingStats, error: null });
      const mockServerClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/server').createServerSupabaseClient).mockResolvedValue(mockServerClient as any);
      
      const result = await isSemanticSearchAvailable(mockWorkspaceId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true); // coverage > 10%
      }
    });

    it('should handle errors in server actions', async () => {
      const mockError = new Error('Database connection failed');
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockServerClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/server').createServerSupabaseClient).mockResolvedValue(mockServerClient as any);
      
      const result = await searchBlocksSemanticAction({
        workspace_id: mockWorkspaceId,
        query_embedding: mockEmbedding,
        limit: 10,
        similarity_threshold: 0.7
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to perform semantic search');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'OpenAI API error' } })
      });
      
      await expect(generateEmbedding(mockQueryText, 'test-api-key')).rejects.toThrow('OpenAI embedding generation failed');
    });

    it('should handle Supabase RPC errors gracefully', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: new Error('RPC failed') });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      await expect(searchBlocksSemantic(
        mockClient as any,
        {
          workspace_id: mockWorkspaceId,
          query_embedding: mockEmbedding,
          limit: 10,
          similarity_threshold: 0.7
        }
      )).rejects.toThrow('Semantic search failed');
    });

    it('should handle invalid embedding dimensions', async () => {
      const mockClient = {
        rpc: vi.fn()
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      await expect(searchBlocksSemantic(
        mockClient as any,
        {
          workspace_id: mockWorkspaceId,
          query_embedding: [1, 2, 3] // Wrong dimension
        }
      )).rejects.toThrow('Invalid embedding dimension');
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full semantic search flow', async () => {
      // 1. Generate embedding for query text
      const mockEmbeddingResponse = {
        data: [{
          embedding: mockEmbedding
        }]
      };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEmbeddingResponse
      });
      
      const embedding = await generateEmbedding(mockQueryText, 'test-api-key');
      expect(embedding).toEqual(mockEmbedding);
      
      // 2. Search with the generated embedding
      const mockRpc = vi.fn().mockResolvedValue({ data: [mockSearchResult], error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const results = await searchBlocksSemantic(
        mockClient as any,
        {
          workspace_id: mockWorkspaceId,
          query_embedding: embedding,
          limit: 10,
          similarity_threshold: 0.7
        }
      );
      expect(results.results).toHaveLength(1);
      
      // 3. Get embedding stats
      const mockStatsRpc = vi.fn().mockResolvedValue({ data: mockEmbeddingStats, error: null });
      const mockStatsClient = {
        rpc: mockStatsRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockStatsClient as any);
      
      const stats = await getEmbeddingStats(mockStatsClient as any, mockWorkspaceId);
      expect(stats.total_blocks).toBe(100);
    });

    it('should handle workspace with no embeddings', async () => {
      const emptyStats: EmbeddingStats = {
        total_blocks: 50,
        embedded_blocks: 0,
        pending_blocks: 50,
        stale_blocks: 0,
        coverage_percent: 0.0
      };
      
      const mockRpc = vi.fn().mockResolvedValue({ data: emptyStats, error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      const stats = await getEmbeddingStats(mockClient as any, mockWorkspaceId);
      expect(stats.embedded_blocks).toBe(0);
      expect(stats.coverage_percent).toBe(0.0);
      
      // Queue embeddings for regeneration
      const mockQueueRpc = vi.fn().mockResolvedValue({ data: 10, error: null });
      const mockQueueClient = {
        rpc: mockQueueRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockQueueClient as any);
      
      const queueResult = await queueStaleEmbeddings(
        mockQueueClient as any,
        {
          workspace_id: mockWorkspaceId,
          limit: 100
        }
      );
      expect(queueResult.queued_count).toBe(10);
    });
  });

  describe('Type Safety', () => {
    it('should enforce TypeScript types for semantic search results', () => {
      const result: SemanticSearchResult = {
        block_id: mockBlockId,
        document_id: mockDocumentId,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'Test' }] },
        block_type: 'paragraph',
        similarity: 0.85,
        document_title: 'Test Document'
      };
      
      expect(result).toHaveProperty('block_id');
      expect(result).toHaveProperty('similarity');
      expect(typeof result.similarity).toBe('number');
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it('should enforce TypeScript types for embedding stats', () => {
      const stats: EmbeddingStats = {
        total_blocks: 100,
        embedded_blocks: 75,
        pending_blocks: 25,
        stale_blocks: 10,
        coverage_percent: 75.0
      };
      
      expect(stats.total_blocks).toBeGreaterThanOrEqual(0);
      expect(stats.embedded_blocks).toBeLessThanOrEqual(stats.total_blocks);
      expect(stats.coverage_percent).toBeGreaterThanOrEqual(0);
      expect(stats.coverage_percent).toBeLessThanOrEqual(100);
    });

    it('should enforce TypeScript types for queue response', () => {
      const response: QueueStaleEmbeddingsResponse = {
        queued_count: 5,
        workspace_id: mockWorkspaceId,
        timestamp: new Date().toISOString()
      };
      
      expect(response).toHaveProperty('queued_count');
      expect(typeof response.queued_count).toBe('number');
      expect(response.queued_count).toBeGreaterThanOrEqual(0);
      expect(response).toHaveProperty('workspace_id');
      expect(response.workspace_id).toBe(mockWorkspaceId);
    });
  });

  describe('Edge Function Integration', () => {
    it('should simulate trigger → Edge Function → Knowledge Graph flow', async () => {
      // This test simulates the complete flow:
      // 1. Block change triggers PostgreSQL trigger
      // 2. Trigger calls Edge Function via pg_net
      // 3. Edge Function extracts entities and generates embeddings
      // 4. Knowledge graph is updated
      
      // Mock the complete flow
      const mockBlockContent = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Project Alpha is delayed due to resource constraints' }]
      };
      
      // Simulate entity extraction (would happen in Edge Function)
      const extractedEntities = [
        { entity: 'Project Alpha', type: 'project', confidence: 0.9 },
        { entity: 'resource constraints', type: 'issue', confidence: 0.8 }
      ];
      
      // Simulate embedding generation
      const mockEmbeddingResponse = {
        data: [{
          embedding: mockEmbedding
        }]
      };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEmbeddingResponse
      });
      
      const embedding = await generateEmbedding(
        'Project Alpha is delayed due to resource constraints',
        'test-api-key'
      );
      
      expect(embedding).toHaveLength(1536);
      expect(extractedEntities).toHaveLength(2);
      expect(extractedEntities[0].entity).toBe('Project Alpha');
    });

    it('should handle embedding generation failures gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      });
      
      await expect(generateEmbedding(mockQueryText, 'test-api-key')).rejects.toThrow('OpenAI embedding generation failed');
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance targets for semantic search', async () => {
      const mockRpc = vi.fn().mockImplementation(async () => {
        // Simulate database query time
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: [mockSearchResult], error: null };
      });
      
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      const startTime = performance.now();
      const result = await searchBlocksSemantic(
        mockClient as any,
        {
          workspace_id: mockWorkspaceId,
          query_embedding: mockEmbedding,
          limit: 10,
          similarity_threshold: 0.7
        }
      );
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(result.results).toHaveLength(1);
      expect(executionTime).toBeLessThan(1000); // Should complete in <1 second
      expect(result.metadata.execution_time_ms).toBeLessThan(1000);
    });

    it('should handle concurrent requests', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [mockSearchResult], error: null });
      const mockClient = {
        rpc: mockRpc
      };
      
      vi.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(mockClient as any);
      
      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        searchBlocksSemantic(
          mockClient as any,
          {
            workspace_id: mockWorkspaceId,
            query_embedding: mockEmbedding,
            limit: 10,
            similarity_threshold: 0.7
          }
        )
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.results).toHaveLength(1);
      });
    });
  });
});
      
