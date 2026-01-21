'use server';

/**
 * Document Server Actions
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Server Actions for querying documents.
 * All actions enforce authentication and workspace membership.
 */

import { createClient } from '@/lib/supabase/server';
import { withTracking } from '@/lib/utils/apiTracker';
import type {
    Document,
    DocumentFilters,
    DocumentQueryOptions,
    DocumentActionResult,
    DocumentsQueryResult,
    DocumentSortBy,
} from '../types';

// ============================================================
// Authentication Helper
// ============================================================

interface AuthContext {
    userId: string;
    workspaceId: string;
}

async function requireAuth(): Promise<AuthContext> {
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
// Query Actions
// ============================================================

/**
 * Get documents with optional filtering and sorting
 */
export const getDocuments = withTracking('getDocuments', async (
    options: DocumentQueryOptions = {}
): Promise<DocumentsQueryResult> => {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const {
            filters = {},
            sortBy = 'updated_at',
            sortDirection = 'desc',
            limit = 100,
            offset = 0,
        } = options;

        // Build query
        let query = supabase
            .from('documents')
            .select('*', { count: 'exact' })
            .eq('workspace_id', workspaceId);

        // Apply filters
        if (filters.isArchived !== undefined) {
            query = query.eq('is_archived', filters.isArchived);
        }

        if (filters.search) {
            query = query.ilike('title', `%${filters.search}%`);
        }

        // Apply ordering and pagination
        query = query
            .order(sortBy, { ascending: sortDirection === 'asc' })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('[documentActions] getDocuments error:', error);

            // Check for RLS violation
            if (error.code === 'PGRST116') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }

            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: (data as Document[]) || [],
            count: count || 0,
        };
    } catch (error) {
        console.error('[documentActions] getDocuments unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in to view documents', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'You do not have access to this workspace', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch documents', code: 'UNKNOWN' };
    }
});

/**
 * Get recently modified documents (last 5)
 */
export const getRecentDocuments = withTracking('getRecentDocuments', async (): Promise<DocumentsQueryResult> => {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('[documentActions] getRecentDocuments error:', error);
            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: (data as Document[]) || [],
            count: data?.length || 0,
        };
    } catch (error) {
        console.error('[documentActions] getRecentDocuments unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch recent documents', code: 'UNKNOWN' };
    }
});

/**
 * Get total count of documents in workspace
 */
export const getDocumentCount = withTracking('getDocumentCount', async (): Promise<DocumentActionResult<{ count: number }>> => {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { count, error } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('is_archived', false);

        if (error) {
            console.error('[documentActions] getDocumentCount error:', error);
            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: { count: count || 0 },
        };
    } catch (error) {
        console.error('[documentActions] getDocumentCount unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch document count', code: 'UNKNOWN' };
    }
});

/**
 * Update document title
 */
export const updateDocumentTitle = withTracking('updateDocumentTitle', async (
    documentId: string,
    title: string
): Promise<DocumentActionResult> => {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('documents')
            .update({
                title,
                updated_at: new Date().toISOString(),
            })
            .eq('id', documentId)
            .eq('workspace_id', workspaceId)
            .select()
            .single();

        if (error) {
            console.error('[documentActions] updateDocumentTitle error:', error);
            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: data as Document,
        };
    } catch (error) {
        console.error('[documentActions] updateDocumentTitle unexpected error:', error);
        return { success: false, error: 'Failed to update document title', code: 'UNKNOWN' };
    }
});
