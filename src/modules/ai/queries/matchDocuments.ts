/**
 * match_documents Query Wrapper
 * 
 * V2.0 Phase 2: Intelligent Editor
 * 
 * Type-safe client for the match_documents RPC.
 */

import { createClient } from '@/lib/supabase/server';
import type {
    MatchDocumentsParams,
    MatchedDocument,
    MatchDocumentsResult
} from '../types';

/**
 * Calls the match_documents RPC with proper error handling.
 * 
 * @param params - Search parameters including query embedding and workspace_id
 * @returns Array of matched documents with similarity scores
 * 
 * @example
 * const result = await matchDocuments({
 *   query_embedding: embeddingVector,
 *   workspace_id: 'ws-123',
 *   match_count: 10,
 *   match_threshold: 0.75
 * });
 */
export async function matchDocuments(
    params: MatchDocumentsParams
): Promise<MatchDocumentsResult> {
    const {
        query_embedding,
        workspace_id,
        match_count = 5,
        match_threshold = 0.7
    } = params;

    // Validate required params
    if (!workspace_id) {
        return {
            success: false,
            error: 'workspace_id is required for security',
            code: 'UNAUTHORIZED',
        };
    }

    if (!query_embedding || query_embedding.length !== 1536) {
        return {
            success: false,
            error: 'query_embedding must be a 1536-dimensional vector',
            code: 'PROCESSING_ERROR',
        };
    }

    try {
        const supabase = await createClient();

        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: query_embedding,
            p_workspace_id: workspace_id,
            match_count: match_count,
            match_threshold: match_threshold,
        });

        if (error) {
            console.error('[matchDocuments] RPC error:', error);

            // Check for access denied
            if (error.message.includes('Access denied')) {
                return {
                    success: false,
                    error: 'You do not have access to this workspace',
                    code: 'UNAUTHORIZED',
                };
            }

            return {
                success: false,
                error: error.message,
                code: 'PROCESSING_ERROR',
            };
        }

        return {
            success: true,
            data: (data as MatchedDocument[]) ?? [],
        };
    } catch (err) {
        console.error('[matchDocuments] Unexpected error:', err);
        return {
            success: false,
            error: 'An unexpected error occurred during search',
            code: 'PROCESSING_ERROR',
        };
    }
}
