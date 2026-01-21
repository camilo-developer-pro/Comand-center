'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Block } from '@blocknote/core';
import type {
    SaveDocumentPayload,
    UpdateTitlePayload,
    DocumentActionResponse,
    Document
} from '../types';

/**
 * Validates that the current user has access to the document.
 * RLS handles the actual security, but this provides a clean error.
 */
async function validateDocumentAccess(
    documentId: string
): Promise<{ valid: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { valid: false, error: 'Authentication required' };
    }

    const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('id', documentId)
        .single();

    if (error || !data) {
        return { valid: false, error: 'Document not found or access denied' };
    }

    return { valid: true };
}

/**
 * Saves document content (JSONB) to Supabase.
 * Called by the debounced auto-save in the Editor component.
 */
export async function saveDocument(
    payload: SaveDocumentPayload
): Promise<DocumentActionResponse> {
    try {
        const validation = await validateDocumentAccess(payload.documentId);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('documents')
            .update({
                content: payload.content as any,
                updated_at: new Date().toISOString(),
            })
            .eq('id', payload.documentId)
            .select()
            .single();

        if (error) {
            console.error('[saveDocument] Supabase error:', error);
            return { success: false, error: 'Failed to save document' };
        }

        return {
            success: true,
            data: data as unknown as Document
        };
    } catch (err) {
        console.error('[saveDocument] Unexpected error:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Deletes a document by ID.
 */
export async function deleteDocument(
    documentId: string
): Promise<DocumentActionResponse> {
    try {
        const validation = await validateDocumentAccess(documentId);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const supabase = await createClient();

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (error) {
            console.error('[deleteDocument] Supabase error:', error);
            return { success: false, error: 'Failed to delete document' };
        }

        revalidatePath('/documents');

        return { success: true, data: {} as any };
    } catch (err) {
        console.error('[deleteDocument] Unexpected error:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Updates document title.
 */
export async function updateDocumentTitle(
    payload: UpdateTitlePayload
): Promise<DocumentActionResponse> {
    try {
        const validation = await validateDocumentAccess(payload.documentId);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('documents')
            .update({
                title: payload.title,
                updated_at: new Date().toISOString(),
            })
            .eq('id', payload.documentId)
            .select()
            .single();

        if (error) {
            console.error('[updateDocumentTitle] Supabase error:', error);
            return { success: false, error: 'Failed to update title' };
        }

        revalidatePath(`/documents/${payload.documentId}`);

        return {
            success: true,
            data: data as unknown as Document
        };
    } catch (err) {
        console.error('[updateDocumentTitle] Unexpected error:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Fetches a single document by ID.
 * Used by the page shell (Server Component) to get initial data.
 */
export async function getDocument(
    documentId: string
): Promise<DocumentActionResponse> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'Authentication required' };
        }

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error) {
            console.error('[getDocument] Supabase error:', error);
            return { success: false, error: 'Document not found' };
        }

        return {
            success: true,
            data: data as unknown as Document
        };
    } catch (err) {
        console.error('[getDocument] Unexpected error:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Creates a new document in the user's workspace.
 */
export async function createDocument(
    workspaceId: string,
    title: string = 'Untitled Document'
): Promise<DocumentActionResponse> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'Authentication required' };
        }

        // Verify workspace membership
        const { data: membership, error: memberError } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single();

        if (memberError || !membership) {
            return { success: false, error: 'Workspace access denied' };
        }

        const { data, error } = await supabase
            .from('documents')
            .insert({
                title,
                content: [],
                workspace_id: workspaceId,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[createDocument] Supabase error:', error);
            return { success: false, error: 'Failed to create document' };
        }

        revalidatePath('/documents');

        return {
            success: true,
            data: data as unknown as Document
        };
    } catch (err) {
        console.error('[createDocument] Unexpected error:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
