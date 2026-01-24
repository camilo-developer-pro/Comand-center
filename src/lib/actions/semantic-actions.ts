// ============================================================================
// V3.1 Phase 3: Semantic Search Server Actions
// File: src/lib/actions/semantic-actions.ts
// Purpose: Server Actions for semantic block search and embedding management
// ============================================================================

'use server';

import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { 
  searchBlocksSemantic,
  getEmbeddingStats,
  queueStaleEmbeddings,
  getEmbeddingHealth,
  type SemanticSearchParams,
  type SemanticSearchResponse,
  type EmbeddingStats,
  type EmbeddingHealth,
  type QueueStaleEmbeddingsParams,
  type QueueStaleEmbeddingsResponse
} from '@/lib/supabase/semantic-search';
import { ActionResult, success, failure } from './types';

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

const SearchBlocksSemanticSchema = z.object({
  workspace_id: z.string().uuid(),
  query_embedding: z.array(z.number()).length(1536, 'Embedding must be 1536-dimensional'),
  limit: z.number().int().positive().max(100).default(10),
  similarity_threshold: z.number().min(0).max(1).default(0.7)
});

const GetEmbeddingStatsSchema = z.object({
  workspace_id: z.string().uuid()
});

const QueueStaleEmbeddingsSchema = z.object({
  workspace_id: z.string().uuid(),
  limit: z.number().int().positive().max(1000).default(100)
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Search blocks semantically within a workspace
 */
export async function searchBlocksSemanticAction(
  params: z.infer<typeof SearchBlocksSemanticSchema>
): Promise<ActionResult<SemanticSearchResponse>> {
  try {
    // Validate input
    const validated = SearchBlocksSemanticSchema.parse(params);
    
    // Create server client
    const supabase = await createServerSupabaseClient();
    
    // Perform semantic search
    const results = await searchBlocksSemantic(
      supabase,
      validated as SemanticSearchParams
    );
    
    return success(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(
        'Invalid input parameters: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        'VALIDATION_ERROR'
      );
    }
    
    if (error instanceof Error) {
      return failure(
        `Failed to perform semantic search: ${error.message}`,
        'SEMANTIC_SEARCH_ERROR'
      );
    }
    
    return failure(
      'An unexpected error occurred during semantic search',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Get embedding statistics for a workspace
 */
export async function getEmbeddingStatsAction(
  params: z.infer<typeof GetEmbeddingStatsSchema>
): Promise<ActionResult<EmbeddingStats>> {
  try {
    // Validate input
    const validated = GetEmbeddingStatsSchema.parse(params);
    
    // Create server client
    const supabase = await createServerSupabaseClient();
    
    // Get embedding stats
    const stats = await getEmbeddingStats(supabase, validated.workspace_id);
    
    return success(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(
        'Invalid input parameters: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        'VALIDATION_ERROR'
      );
    }
    
    if (error instanceof Error) {
      return failure(
        `Failed to retrieve embedding statistics: ${error.message}`,
        'EMBEDDING_STATS_ERROR'
      );
    }
    
    return failure(
      'An unexpected error occurred while fetching embedding statistics',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Queue stale embeddings for reprocessing
 */
export async function queueStaleEmbeddingsAction(
  params: z.infer<typeof QueueStaleEmbeddingsSchema>
): Promise<ActionResult<QueueStaleEmbeddingsResponse>> {
  try {
    // Validate input
    const validated = QueueStaleEmbeddingsSchema.parse(params);
    
    // Create server client
    const supabase = await createServerSupabaseClient();
    
    // Queue stale embeddings
    const result = await queueStaleEmbeddings(
      supabase,
      validated as QueueStaleEmbeddingsParams
    );
    
    return success(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(
        'Invalid input parameters: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        'VALIDATION_ERROR'
      );
    }
    
    if (error instanceof Error) {
      return failure(
        `Failed to queue stale embeddings: ${error.message}`,
        'QUEUE_EMBEDDINGS_ERROR'
      );
    }
    
    return failure(
      'An unexpected error occurred while queuing stale embeddings',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Get embedding health overview for a workspace
 * Combines stats with additional health metrics
 */
export async function getEmbeddingHealthAction(
  workspace_id: string
): Promise<ActionResult<{
  stats: EmbeddingStats;
  health: EmbeddingHealth[];
  health_status: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
}>> {
  try {
    // Validate workspace ID
    if (!workspace_id || typeof workspace_id !== 'string') {
      return failure('Invalid workspace ID', 'VALIDATION_ERROR');
    }
    
    // Create server client
    const supabase = await createServerSupabaseClient();
    
    // Get embedding stats
    const stats = await getEmbeddingStats(supabase, workspace_id);
    
    // Get embedding health data
    const health = await getEmbeddingHealth(supabase, workspace_id);
    
    // Calculate health status
    let health_status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];
    
    if (stats.coverage_percent < 50) {
      health_status = 'critical';
      recommendations.push(`Low embedding coverage (${stats.coverage_percent}%). Consider running a backfill.`);
    } else if (stats.coverage_percent < 80) {
      health_status = 'warning';
      recommendations.push(`Moderate embedding coverage (${stats.coverage_percent}%). Some blocks may not be searchable.`);
    }
    
    if (stats.stale_blocks > 100) {
      health_status = health_status === 'healthy' ? 'warning' : 'critical';
      recommendations.push(`High number of stale blocks (${stats.stale_blocks}). Consider reprocessing.`);
    }
    
    if (stats.pending_blocks > 500) {
      health_status = 'critical';
      recommendations.push(`Large number of pending embeddings (${stats.pending_blocks}). Queue processing may be backlogged.`);
    }
    
    return success({
      stats,
      health,
      health_status,
      recommendations
    });
  } catch (error) {
    if (error instanceof Error) {
      return failure(
        `Failed to retrieve embedding health: ${error.message}`,
        'EMBEDDING_HEALTH_ERROR'
      );
    }
    
    return failure(
      'An unexpected error occurred while fetching embedding health',
      'UNKNOWN_ERROR'
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if semantic search is available for a workspace
 */
export async function isSemanticSearchAvailable(
  workspace_id: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createServerSupabaseClient();
    const stats = await getEmbeddingStats(supabase, workspace_id);
    
    // Semantic search is available if at least 10% of blocks have embeddings
    const isAvailable = stats.coverage_percent > 10;
    
    return success(isAvailable);
  } catch (error) {
    // If we can't get stats, assume semantic search is not available
    return success(false);
  }
}

/**
 * Trigger embedding regeneration for a specific block
 */
export async function regenerateBlockEmbedding(
  block_id: string
): Promise<ActionResult<{ success: boolean; message: string }>> {
  try {
    // Create server client
    const supabase = await createServerSupabaseClient();
    
    // Get block content
    const { data: block, error: blockError } = await supabase
      .from('blocks')
      .select('content, document_id')
      .eq('id', block_id)
      .single();
    
    if (blockError) {
      return failure(
        `Block not found: ${blockError.message}`,
        'BLOCK_NOT_FOUND'
      );
    }
    
    // Extract text from TipTap content
    const textContent = extractTextFromTipTap(block.content);
    
    if (!textContent.trim()) {
      return failure(
        'Block has no text content to embed',
        'NO_TEXT_CONTENT'
      );
    }
    
    // Note: In a real implementation, we would call an Edge Function
    // or background job to regenerate the embedding
    // For now, we'll just mark it as stale so it gets picked up by the queue
    
    const { error: updateError } = await supabase
      .from('blocks')
      .update({
        embedding_updated_at: null // Mark as stale
      })
      .eq('id', block_id);
    
    if (updateError) {
      return failure(
        `Failed to mark block for regeneration: ${updateError.message}`,
        'UPDATE_ERROR'
      );
    }
    
    return success({
      success: true,
      message: `Block ${block_id} marked for embedding regeneration`
    });
  } catch (error) {
    if (error instanceof Error) {
      return failure(
        `Failed to regenerate block embedding: ${error.message}`,
        'REGENERATION_ERROR'
      );
    }
    
    return failure(
      'An unexpected error occurred while regenerating block embedding',
      'UNKNOWN_ERROR'
    );
  }
}

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Extract plain text from TipTap JSON content
 */
function extractTextFromTipTap(content: any): string {
  if (!content || typeof content !== 'object') {
    return '';
  }
  
  // Handle TipTap content structure
  if (content.type === 'doc' && Array.isArray(content.content)) {
    return extractTextFromNodes(content.content);
  }
  
  // Handle simple text content
  if (content.text) {
    return content.text;
  }
  
  return JSON.stringify(content);
}

/**
 * Recursively extract text from TipTap nodes
 */
function extractTextFromNodes(nodes: any[]): string {
  let text = '';
  
  for (const node of nodes) {
    if (node.text) {
      text += node.text + ' ';
    }
    
    if (node.content && Array.isArray(node.content)) {
      text += extractTextFromNodes(node.content) + ' ';
    }
    
    if (node.children && Array.isArray(node.children)) {
      text += extractTextFromNodes(node.children) + ' ';
    }
  }
  
  return text.trim();
}