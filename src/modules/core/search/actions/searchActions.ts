'use server';

/**
 * Search Server Actions
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Implements PostgreSQL full-text search for documents.
 */

import { createClient } from '@/lib/supabase/server';
import type { SearchResult, SearchOptions, SearchActionResult } from '../types';

// ============================================================
// Authentication Helper
// ============================================================

async function requireAuth(): Promise<{ userId: string; workspaceId: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('UNAUTHORIZED');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.default_workspace_id) {
        throw new Error('FORBIDDEN');
    }

    return { userId: user.id, workspaceId: profile.default_workspace_id };
}

// ============================================================
// Search Actions
// ============================================================

/**
 * Search documents using PostgreSQL full-text search.
 */
export async function searchDocuments(
    options: SearchOptions
): Promise<SearchActionResult<SearchResult[]>> {
    const { query, limit = 10, offset = 0 } = options;

    if (!query || query.trim().length < 2) {
        return { success: true, data: [] };
    }

    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        /**
         * PostgreSQL Full-Text Search Query:
         * 1. plainto_tsquery: Converts natural language to tsquery
         * 2. ts_headline: Generates highlighted snippets
         * 3. ts_rank: Calculates relevance rank
         * 4. @@: Match operator
         */
        const { data, error } = await supabase.rpc('search_documents_with_highlights', {
            p_workspace_id: workspaceId,
            p_query: query,
            p_limit: limit,
            p_offset: offset
        });

        if (error) {
            console.error('[searchActions] searchDocuments error:', error);
            // Fallback to a simpler query if the RPC doesn't exist yet
            // or if there's an issue with highlights
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('documents')
                .select('id, title, updated_at, search_vector')
                .eq('workspace_id', workspaceId)
                .textSearch('search_vector', query, { config: 'english', type: 'plain' })
                .order('updated_at', { ascending: false })
                .limit(limit)
                .range(offset, offset + limit - 1);

            if (fallbackError) throw fallbackError;

            return {
                success: true,
                data: (fallbackData || []).map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    titleHighlight: doc.title, // No highlight in fallback
                    rank: 1,
                    updatedAt: doc.updated_at
                }))
            };
        }

        return {
            success: true,
            data: (data as any[] || []).map(item => ({
                id: item.id,
                title: item.title,
                titleHighlight: item.title_highlight,
                rank: item.rank,
                updatedAt: item.updated_at
            }))
        };
    } catch (error) {
        console.error('[searchActions] searchDocuments unexpected error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search documents'
        };
    }
}
