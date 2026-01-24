'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { success, failure, type ActionResult } from './types';
import type { Tables } from '@/lib/db/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// TipTap content schema - matches the structure from BlockIDExtension
// Using z.any() for JSONB compatibility
const BlockContentSchema = z.any();

// Single block upsert schema
const UpsertBlockSchema = z.object({
  blockId: z.string().uuid(),
  documentId: z.string().uuid(),
  type: z.string(),
  content: BlockContentSchema,
  sortOrder: z.string().min(1),
  parentPath: z.string().default('root'),
});

// Batch sync schema
const SyncBlocksSchema = z.object({
  documentId: z.string().uuid(),
  blocks: z.array(UpsertBlockSchema),
  deletedBlockIds: z.array(z.string().uuid()).default([]),
});

// Reorder Block (update sortOrder only)
const ReorderBlockSchema = z.object({
  blockId: z.string().uuid(),
  documentId: z.string().uuid(),
  newSortOrder: z.string().min(1),
});

// ============================================================================
// TYPES
// ============================================================================

type Block = Tables<'blocks'>;
type UpsertBlockInput = z.infer<typeof UpsertBlockSchema>;
type SyncBlocksInput = z.infer<typeof SyncBlocksSchema>;
export type ReorderBlockInput = z.infer<typeof ReorderBlockSchema>;

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Upsert a single block (INSERT ON CONFLICT UPDATE)
 */
export async function upsertBlock(
  input: UpsertBlockInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = UpsertBlockSchema.safeParse(input);
    if (!validated.success) {
      return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return failure('You must be logged in', 'UNAUTHORIZED');
    }

    const { blockId, documentId, type, content, sortOrder, parentPath } = validated.data;

    // Verify document access via workspace membership
    const document = await db
      .selectFrom('documents')
      .innerJoin('workspace_members', (join) =>
        join.onRef('workspace_members.workspace_id', '=', 'documents.workspace_id')
          .on('workspace_members.user_id', '=', user.id)
      )
      .select(['documents.id'])
      .where('documents.id', '=', documentId)
      .executeTakeFirst();

    if (!document) {
      return failure('Document not found or access denied', 'NOT_FOUND');
    }

    // Calculate content hash for change detection
    const contentString = JSON.stringify(content);
    const contentHash = await hashContent(contentString);

    // Upsert the block using Kysely
    const result = await db
      .insertInto('blocks')
      .values({
        id: blockId,
        document_id: documentId,
        type,
        content: content,
        sort_order: sortOrder,
        parent_path: parentPath,
        content_hash: contentHash,
        created_by: user.id,
        last_edited_by: user.id,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          content: content,
          sort_order: sortOrder,
          parent_path: parentPath,
          content_hash: contentHash,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
        })
      )
      .returning(['id'])
      .executeTakeFirstOrThrow();

    // Update document's updated_at
    await db
      .updateTable('documents')
      .set({
        updated_at: new Date().toISOString(),
        last_edited_by: user.id,
      })
      .where('id', '=', documentId)
      .execute();

    revalidatePath(`/documents/${documentId}`);

    return success({ id: result.id });
  } catch (error) {
    console.error('Block upsert error:', error);
    return failure('Failed to save block', 'DATABASE_ERROR');
  }
}

/**
 * Batch sync blocks (primary method for editor saves)
 * Handles upserts and deletes atomically in a transaction
 */
export async function syncBlocks(
  input: SyncBlocksInput
): Promise<ActionResult<{ upserted: number; deleted: number }>> {
  try {
    const validated = SyncBlocksSchema.safeParse(input);
    if (!validated.success) {
      return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return failure('You must be logged in', 'UNAUTHORIZED');
    }

    const { documentId, blocks, deletedBlockIds } = validated.data;

    // Verify document access via workspace membership
    const document = await db
      .selectFrom('documents')
      .innerJoin('workspace_members', (join) =>
        join.onRef('workspace_members.workspace_id', '=', 'documents.workspace_id')
          .on('workspace_members.user_id', '=', user.id)
      )
      .select(['documents.id'])
      .where('documents.id', '=', documentId)
      .executeTakeFirst();

    if (!document) {
      return failure('Document not found or access denied', 'NOT_FOUND');
    }

    let upsertedCount = 0;
    let deletedCount = 0;

    // Use a transaction for atomicity
    await db.transaction().execute(async (trx) => {
      // Delete removed blocks
      if (deletedBlockIds.length > 0) {
        const deleteResult = await trx
          .deleteFrom('blocks')
          .where('id', 'in', deletedBlockIds)
          .where('document_id', '=', documentId)
          .execute();

        // Kysely returns an array of result objects, count them
        deletedCount = deletedBlockIds.length;
      }

      // Upsert blocks in batch
      for (const block of blocks) {
        const contentString = JSON.stringify(block.content);
        const contentHash = await hashContent(contentString);

        await trx
          .insertInto('blocks')
          .values({
            id: block.blockId,
            document_id: documentId,
            type: block.type,
            content: block.content,
            sort_order: block.sortOrder,
            parent_path: block.parentPath,
            content_hash: contentHash,
            created_by: user.id,
            last_edited_by: user.id,
          })
          .onConflict((oc) =>
            oc.column('id').doUpdateSet({
              content: block.content,
              sort_order: block.sortOrder,
              parent_path: block.parentPath,
              content_hash: contentHash,
              last_edited_by: user.id,
              updated_at: new Date().toISOString(),
            })
          )
          .execute();
        
        upsertedCount++;
      }

      // Update document's updated_at
      await trx
        .updateTable('documents')
        .set({
          updated_at: new Date().toISOString(),
          last_edited_by: user.id,
        })
        .where('id', '=', documentId)
        .execute();
    });

    revalidatePath(`/documents/${documentId}`);

    return success({ 
      upserted: upsertedCount, 
      deleted: deletedCount 
    });
  } catch (error) {
    console.error('Block sync error:', error);
    return failure('Failed to sync blocks', 'DATABASE_ERROR');
  }
}

/**
 * Get all blocks for a document
 */
export async function getDocumentBlocks(
  documentId: string
): Promise<ActionResult<Array<{
  id: string;
  type: string;
  content: unknown;
  sortOrder: string;
  parentPath: string;
}>>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return failure('You must be logged in', 'UNAUTHORIZED');
    }

    // Verify document access via workspace membership
    const document = await db
      .selectFrom('documents')
      .innerJoin('workspace_members', (join) =>
        join.onRef('workspace_members.workspace_id', '=', 'documents.workspace_id')
          .on('workspace_members.user_id', '=', user.id)
      )
      .select(['documents.id'])
      .where('documents.id', '=', documentId)
      .executeTakeFirst();

    if (!document) {
      return failure('Document not found or access denied', 'NOT_FOUND');
    }

    const blocks = await db
      .selectFrom('blocks')
      .select(['id', 'type', 'content', 'sort_order', 'parent_path'])
      .where('document_id', '=', documentId)
      .orderBy('sort_order', 'asc')
      .execute();

    return success(
      blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        sortOrder: block.sort_order,
        parentPath: block.parent_path,
      }))
    );
  } catch (error) {
    console.error('Get blocks error:', error);
    return failure('Failed to fetch blocks', 'DATABASE_ERROR');
  }
}

/**
 * Delete a block by ID
 */
export async function deleteBlock(
  blockId: string
): Promise<ActionResult<void>> {
  try {
    if (!z.string().uuid().safeParse(blockId).success) {
      return failure('Invalid block ID', 'VALIDATION_ERROR');
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return failure('You must be logged in', 'UNAUTHORIZED');
    }

    // Get the block to find its document for revalidation
    const block = await db
      .selectFrom('blocks')
      .select(['document_id'])
      .where('id', '=', blockId)
      .executeTakeFirst();

    if (!block) {
      return failure('Block not found', 'NOT_FOUND');
    }

    // Verify access via workspace membership
    const document = await db
      .selectFrom('documents')
      .innerJoin('workspace_members', (join) =>
        join.onRef('workspace_members.workspace_id', '=', 'documents.workspace_id')
          .on('workspace_members.user_id', '=', user.id)
      )
      .select(['documents.id'])
      .where('documents.id', '=', block.document_id)
      .executeTakeFirst();

    if (!document) {
      return failure('Access denied', 'UNAUTHORIZED');
    }

    await db
      .deleteFrom('blocks')
      .where('id', '=', blockId)
      .execute();

    // Update document's updated_at
    await db
      .updateTable('documents')
      .set({
        updated_at: new Date().toISOString(),
        last_edited_by: user.id,
      })
      .where('id', '=', block.document_id)
      .execute();

    revalidatePath(`/documents/${block.document_id}`);

    return success(undefined);
  } catch (error) {
    console.error('Delete block error:', error);
    return failure('Failed to delete block', 'DATABASE_ERROR');
  }
}

/**
 * Reorder a block (update sortOrder only)
 */
export async function reorderBlock(
  input: ReorderBlockInput
): Promise<ActionResult<{ id: string; sortOrder: string }>> {
  try {
    const validation = ReorderBlockSchema.safeParse(input);
    if (!validation.success) {
      return failure(validation.error.issues[0].message, 'VALIDATION_ERROR');
    }
    
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return failure('You must be logged in', 'UNAUTHORIZED');
    }
    
    const { blockId, documentId, newSortOrder } = validation.data;
    
    // Verify document access via workspace membership
    const document = await db
      .selectFrom('documents')
      .innerJoin('workspace_members', (join) =>
        join.onRef('workspace_members.workspace_id', '=', 'documents.workspace_id')
          .on('workspace_members.user_id', '=', user.id)
      )
      .select(['documents.id'])
      .where('documents.id', '=', documentId)
      .executeTakeFirst();
    
    if (!document) {
      return failure('Document not found or access denied', 'NOT_FOUND');
    }
    
    // Check for collision and retry with jitter if needed
    const existing = await db
      .selectFrom('blocks')
      .select(['id'])
      .where('document_id', '=', documentId)
      .where('sort_order', '=', newSortOrder)
      .where('id', '!=', blockId)
      .executeTakeFirst();
    
    let finalSortOrder = newSortOrder;
    
    if (existing) {
      // Collision detected - add additional jitter
      const jitter = Array.from(crypto.getRandomValues(new Uint8Array(2)))
        .map(b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[b % 62])
        .join('');
      finalSortOrder = newSortOrder + jitter;
    }
    
    // Update the block's sortOrder
    const result = await db
      .updateTable('blocks')
      .set({
        sort_order: finalSortOrder,
        updated_at: new Date().toISOString(),
        last_edited_by: user.id,
      })
      .where('id', '=', blockId)
      .where('document_id', '=', documentId)
      .returning(['id', 'sort_order'])
      .executeTakeFirstOrThrow();
    
    // Update document's updated_at
    await db
      .updateTable('documents')
      .set({
        updated_at: new Date().toISOString(),
        last_edited_by: user.id,
      })
      .where('id', '=', documentId)
      .execute();
    
    revalidatePath(`/documents/${documentId}`);
    
    return success({
      id: result.id,
      sortOrder: result.sort_order
    });
  } catch (error) {
    console.error('Block reorder error:', error);
    return failure('Failed to reorder block', 'DATABASE_ERROR');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Simple hash function for content change detection
 * Uses Node.js crypto module for server compatibility
 */
async function hashContent(content: string): Promise<string> {
  // Use Node.js crypto module for server compatibility
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}
