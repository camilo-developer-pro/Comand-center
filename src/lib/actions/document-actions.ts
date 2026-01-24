'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { sql } from 'kysely';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { success, failure, type ActionResult } from './types';
import { generateUUIDv7 } from '@/lib/utils/uuid';
import { appendToPath, uuidToLtreeLabel } from '@/lib/utils/ltree';
import { db } from '@/lib/db';
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
  documentId: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
  workspaceId: z.string().uuid(),
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
 * Move document to a new parent with transactional ltree updates
 * Includes row-level locking, cycle detection, and descendant path updates
 */
export async function moveDocument(
    input: MoveDocumentInput
): Promise<ActionResult<{ id: string; newPath: string }>> {
    try {
        const validation = moveDocumentSchema.safeParse(input);
        if (!validation.success) {
            return failure(validation.error.message, 'VALIDATION_ERROR');
        }
        
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return failure('Unauthorized', 'UNAUTHORIZED');
        }
        
        const { documentId, newParentId, workspaceId } = validation.data;
        
        try {
            // Use transaction with row-level locking
            const result = await db.transaction().execute(async (trx) => {
                // 1. Lock the document being moved
                const document = await trx
                    .selectFrom('documents')
                    .select(['id', 'path', 'workspace_id'])
                    .where('id', '=', documentId)
                    .where('workspace_id', '=', workspaceId)
                    .forUpdate()
                    .executeTakeFirst();
                
                if (!document) {
                    throw new Error('Document not found');
                }
                
                const oldPath = document.path;
                
                // 2. Determine new parent path
                let newParentPath = 'root';
                
                if (newParentId) {
                    const parent = await trx
                        .selectFrom('documents')
                        .select(['id', 'path'])
                        .where('id', '=', newParentId)
                        .where('workspace_id', '=', workspaceId)
                        .forUpdate()
                        .executeTakeFirst();
                    
                    if (!parent) {
                        throw new Error('Parent document not found');
                    }
                    
                    // 3. Cycle detection: ensure new parent is not a descendant
                    // of the document being moved
                    const isCycle = await trx
                        .selectFrom('documents')
                        .select(['id'])
                        .where('workspace_id', '=', workspaceId)
                        .where('path', '@>', oldPath)
                        .where('id', '=', newParentId)
                        .executeTakeFirst();
                    
                    if (isCycle) {
                        throw new Error('Cannot move document into its own descendant');
                    }
                    
                    newParentPath = parent.path;
                }
                
                // 4. Calculate new path for the moved document
                // Strip hyphens from UUID for ltree compatibility
                const documentIdLabel = uuidToLtreeLabel(documentId);
                const newPath = newParentPath === 'root'
                    ? `root.${documentIdLabel}`
                    : `${newParentPath}.${documentIdLabel}`;
                
                // 5. Update the document's path
                await trx
                    .updateTable('documents')
                    .set({
                        parent_id: newParentId,
                        path: newPath,
                        updated_at: new Date().toISOString(),
                    })
                    .where('id', '=', documentId)
                    .execute();
                
                // 6. Update all descendants' paths atomically
                // Using ltree's subpath function for path transformation
                // Note: We need to use raw SQL for ltree operations
                await trx.executeQuery(
                    sql`
                        UPDATE documents
                        SET
                            path = ${newPath}::ltree || subpath(path, nlevel(${oldPath}::ltree)),
                            updated_at = NOW()
                        WHERE
                            workspace_id = ${workspaceId}
                            AND path <@ ${oldPath}::ltree
                            AND id != ${documentId}
                    `.compile(trx)
                );
                
                return { id: documentId, newPath };
            });
            
            revalidatePath('/documents');
            revalidatePath(`/documents/${documentId}`);
            
            return success(result);
        } catch (error) {
            console.error('Move document transaction error:', error);
            const message = error instanceof Error ? error.message : 'Failed to move document';
            return failure(message, 'DATABASE_ERROR');
        }
    } catch (error) {
        console.error('Unexpected error moving document:', error);
        return failure('An unexpected error occurred', 'INTERNAL_ERROR');
    }
}

/**
 * Get document tree for workspace (hierarchical structure)
 */
export async function getDocumentTree(
    workspaceId: string
): Promise<ActionResult<Array<{
    id: string;
    title: string;
    parentId: string | null;
    path: string;
    isFolder: boolean;
}>>> {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return failure('Unauthorized', 'UNAUTHORIZED');
        }
        
        // Use Kysely for better type safety and ordering
        const documents = await db
            .selectFrom('documents')
            .select(['id', 'title', 'parent_id', 'path', 'is_template'])
            .where('workspace_id', '=', workspaceId)
            .where('is_archived', '=', false)
            .orderBy(sql`nlevel(path)`, 'asc')
            .orderBy('title', 'asc')
            .execute();
        
        return success(
            documents.map((d) => ({
                id: d.id,
                title: d.title,
                parentId: d.parent_id,
                path: d.path,
                isFolder: d.is_template, // Using is_template as folder indicator
            }))
        );
    } catch (error) {
        console.error('Get document tree error:', error);
        return failure('Failed to fetch document tree', 'DATABASE_ERROR');
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
