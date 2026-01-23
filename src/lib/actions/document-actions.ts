'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { success, failure, type ActionResult } from './types';
import { generateUUIDv7 } from '@/lib/utils/uuid';
import { appendToPath } from '@/lib/utils/ltree';
import type { Tables } from '@/lib/db/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDocumentSchema = z.object({
    workspaceId: z.string().uuid(),
    parentId: z.string().uuid().nullable().optional(),
    title: z.string().max(500).optional().default('Untitled'),
});

const updateDocumentSchema = z.object({
    id: z.string().uuid(),
    title: z.string().max(500).optional(),
    icon: z.string().max(50).nullable().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
    isArchived: z.boolean().optional(),
});

const moveDocumentSchema = z.object({
    id: z.string().uuid(),
    newParentId: z.string().uuid().nullable(),
});

// ============================================================================
// TYPES
// ============================================================================

type Document = Tables<'documents'>;
type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
type MoveDocumentInput = z.infer<typeof moveDocumentSchema>;

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Create a new document
 */
export async function createDocument(
    input: CreateDocumentInput
): Promise<ActionResult<Document>> {
    try {
        const validated = createDocumentSchema.safeParse(input);
        if (!validated.success) {
            return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return failure('You must be logged in', 'UNAUTHORIZED');
        }

        // Calculate the ltree path
        let path = 'root';
        if (validated.data.parentId) {
            // Get parent's path
            const { data: parent } = await supabase
                .from('documents')
                .select('path')
                .eq('id', validated.data.parentId)
                .single();

            if (parent) {
                path = appendToPath(parent.path, validated.data.parentId);
            }
        }

        const documentId = generateUUIDv7();

        const { data, error } = await supabase
            .from('documents')
            .insert({
                id: documentId,
                workspace_id: validated.data.workspaceId,
                parent_id: validated.data.parentId || null,
                title: validated.data.title,
                path,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create document:', error);
            return failure('Failed to create document', 'DATABASE_ERROR');
        }

        revalidatePath(`/workspace/[slug]`, 'page');

        return success(data);
    } catch (error) {
        console.error('Unexpected error creating document:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Get documents for a workspace (with optional parent filter)
 */
export async function getDocuments(
    workspaceId: string,
    parentId: string | null = null
): Promise<ActionResult<Document[]>> {
    try {
        const supabase = await createServerSupabaseClient();

        let query = supabase
            .from('documents')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false });

        if (parentId === null) {
            query = query.is('parent_id', null);
        } else {
            query = query.eq('parent_id', parentId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Failed to fetch documents:', error);
            return failure('Failed to fetch documents', 'DATABASE_ERROR');
        }

        return success(data || []);
    } catch (error) {
        console.error('Unexpected error fetching documents:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(
    documentId: string
): Promise<ActionResult<Document | null>> {
    try {
        const supabase = await createServerSupabaseClient();

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Failed to fetch document:', error);
            return failure('Failed to fetch document', 'DATABASE_ERROR');
        }

        return success(data);
    } catch (error) {
        console.error('Unexpected error fetching document:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Update document metadata
 */
export async function updateDocument(
    input: UpdateDocumentInput
): Promise<ActionResult<Document>> {
    try {
        const validated = updateDocumentSchema.safeParse(input);
        if (!validated.success) {
            return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('documents')
            .update({
                ...(validated.data.title !== undefined && { title: validated.data.title }),
                ...(validated.data.icon !== undefined && { icon: validated.data.icon }),
                ...(validated.data.coverImageUrl !== undefined && {
                    cover_image_url: validated.data.coverImageUrl,
                }),
                ...(validated.data.isArchived !== undefined && {
                    is_archived: validated.data.isArchived,
                    archived_at: validated.data.isArchived ? new Date().toISOString() : null,
                }),
                last_edited_by: user?.id,
            })
            .eq('id', validated.data.id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update document:', error);
            return failure('Failed to update document', 'DATABASE_ERROR');
        }

        revalidatePath(`/workspace/[slug]`, 'page');

        return success(data);
    } catch (error) {
        console.error('Unexpected error updating document:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Move document to a new parent (with transaction for ltree update)
 */
export async function moveDocument(
    input: MoveDocumentInput
): Promise<ActionResult<Document>> {
    try {
        const validated = moveDocumentSchema.safeParse(input);
        if (!validated.success) {
            return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        // Get the new parent's path (or 'root' if moving to top level)
        let newPath = 'root';
        if (validated.data.newParentId) {
            const { data: parent } = await supabase
                .from('documents')
                .select('path')
                .eq('id', validated.data.newParentId)
                .single();

            if (!parent) {
                return failure('Parent document not found', 'NOT_FOUND');
            }

            newPath = appendToPath(parent.path, validated.data.newParentId);
        }

        // Update the document
        const { data, error } = await supabase
            .from('documents')
            .update({
                parent_id: validated.data.newParentId,
                path: newPath,
            })
            .eq('id', validated.data.id)
            .select()
            .single();

        if (error) {
            console.error('Failed to move document:', error);
            return failure('Failed to move document', 'DATABASE_ERROR');
        }

        // Note: In a production system, you would also need to update
        // all descendant documents' paths. This requires a transaction
        // with recursive path updates. For V3.1 Phase 1, we keep it simple.

        revalidatePath(`/workspace/[slug]`, 'page');

        return success(data);
    } catch (error) {
        console.error('Unexpected error moving document:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Permanently delete a document
 */
export async function deleteDocument(
    documentId: string
): Promise<ActionResult<void>> {
    try {
        if (!z.string().uuid().safeParse(documentId).success) {
            return failure('Invalid document ID', 'VALIDATION_ERROR');
        }

        const supabase = await createServerSupabaseClient();

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (error) {
            console.error('Failed to delete document:', error);
            return failure('Failed to delete document', 'DATABASE_ERROR');
        }

        revalidatePath(`/workspace/[slug]`, 'page');

        return success(undefined);
    } catch (error) {
        console.error('Unexpected error deleting document:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}
