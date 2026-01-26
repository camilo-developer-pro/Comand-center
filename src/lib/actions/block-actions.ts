'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sql } from 'kysely';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  insertBlock as dbInsertBlock,
  updateBlockContent as dbUpdateBlockContent,
  reorderBlock as dbReorderBlock,
  deleteBlock as dbDeleteBlock
} from '@/lib/db/queries/blocks';
import { BlockInsertSchema, BlockUpdateSchema, BlockReorderSchema } from '@/lib/schemas/block.schema';
import { generateUUIDv7 } from '@/lib/utils/uuid';
import { success, failure, type ActionResult } from './types';
import { db } from '@/lib/db';

export async function createBlockAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Validate
    const parsed = BlockInsertSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    // Execute
    const block = await dbInsertBlock({
      ...parsed.data,
      user_id: user.id,
      id: parsed.data.id ?? generateUUIDv7(),
    });

    revalidatePath(`/workspace/${parsed.data.workspace_id}`);
    return { success: true, data: { id: block.id } };
  } catch (error) {
    console.error('createBlockAction error:', error);
    return { success: false, error: 'Failed to create block' };
  }
}

export async function updateBlockContentAction(
  blockId: string,
  content: unknown
): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Validate content is object
    if (typeof content !== 'object' || content === null) {
      return { success: false, error: 'Invalid content format' };
    }

    await dbUpdateBlockContent(blockId, content as Record<string, unknown>);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('updateBlockContentAction error:', error);
    return { success: false, error: 'Failed to update block' };
  }
}

export async function reorderBlockAction(
  input: unknown
): Promise<ActionResult<{ newSortOrder: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const parsed = BlockReorderSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const newSortOrder = await dbReorderBlock(parsed.data);
    return { success: true, data: { newSortOrder } };
  } catch (error) {
    console.error('reorderBlockAction error:', error);
    return { success: false, error: 'Failed to reorder block' };
  }
}

export async function deleteBlockAction(
  blockId: string,
  workspaceId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await dbDeleteBlock(blockId);
    revalidatePath(`/workspace/${workspaceId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('deleteBlockAction error:', error);
    return { success: false, error: 'Failed to delete block' };
  }
}

/**
 * Create a new sibling block with fractional indexing
 * Used when user presses Enter at the end of a TipTap block
 */
const createSiblingBlockSchema = z.object({
  documentId: z.string().uuid(),
  previousBlockId: z.string().uuid(), // The block BEFORE the new one
  nextBlockId: z.string().uuid().nullable(), // The block AFTER (null if appending)
  type: z.enum(['paragraph', 'heading', 'bulletList', 'numberedList', 'taskItem', 'codeBlock']).default('paragraph'),
  content: z.any().default({ type: 'doc', content: [] }), // TipTap JSON
});

export async function createSiblingBlock(
  input: z.infer<typeof createSiblingBlockSchema>
): Promise<ActionResult<{ id: string; sortOrder: string }>> {
  try {
    // 1. Validate input
    const validated = createSiblingBlockSchema.safeParse(input);
    if (!validated.success) {
      return failure(validated.error.issues[0].message, 'VALIDATION_ERROR');
    }

    const { documentId, previousBlockId, nextBlockId, type, content } = validated.data;

    // 2. Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return failure('You must be logged in', 'UNAUTHORIZED');
    }

    // 3. Fetch sort orders of neighbor blocks from blocks_v3
    const neighborIds = [previousBlockId, nextBlockId].filter(Boolean) as string[];
    const neighbors = await db
      .selectFrom('blocks_v3')
      .select(['id', 'sort_order'])
      .where('id', 'in', neighborIds)
      .execute();

    // 4. Extract prev and next sort orders
    const prevSortOrder = previousBlockId
      ? neighbors.find(n => n.id === previousBlockId)?.sort_order
      : null;
    const nextSortOrder = nextBlockId
      ? neighbors.find(n => n.id === nextBlockId)?.sort_order
      : null;

    // Verify neighbor blocks exist if provided
    if (previousBlockId && !prevSortOrder) {
      return failure(`Previous block ${previousBlockId} not found`, 'NOT_FOUND');
    }
    if (nextBlockId && !nextSortOrder) {
      return failure(`Next block ${nextBlockId} not found`, 'NOT_FOUND');
    }

    // 5. Generate new fractional index key
    const result = await sql<{ new_key: string }>`
      SELECT fi_generate_key_between(${prevSortOrder}, ${nextSortOrder}) AS new_key
    `.execute(db);
    
    const newSortOrder = result.rows[0]?.new_key;
    if (!newSortOrder) {
      return failure('Failed to generate fractional index key', 'FRACTIONAL_INDEX_ERROR');
    }

    // 6. Generate UUIDv7 for new block
    const newBlockId = generateUUIDv7();

    // 7. Map type to BlockType enum
    // The Zod schema uses different values than BlockTypeEnum, so we need to map them
    const typeMapping: Record<string, string> = {
      'paragraph': 'text',
      'heading': 'heading',
      'bulletList': 'text', // Default to text for list types
      'numberedList': 'text',
      'taskItem': 'task',
      'codeBlock': 'code'
    };
    const blockType = typeMapping[type] || 'text';

    // 8. Insert new block into blocks_v3
    const newBlock = await db
      .insertInto('blocks_v3')
      .values({
        id: newBlockId,
        workspace_id: documentId, // Using documentId as workspace_id for backward compatibility
        user_id: user.id,
        parent_id: null, // Sibling blocks at root level
        path: '.', // Default path, will be updated by trigger if needed
        sort_order: newSortOrder,
        type: blockType as any, // Cast to BlockType enum
        content: JSON.stringify(content),
        // created_at and updated_at are generated columns
      })
      .returning(['id', 'sort_order'])
      .executeTakeFirstOrThrow();

    // 8. Return success with new block ID and sort order
    return success({
      id: newBlock.id,
      sortOrder: newBlock.sort_order
    });

  } catch (error) {
    console.error('[createSiblingBlock] error:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint')) {
        return failure('Document not found or access denied', 'DATABASE_ERROR');
      }
      if (error.message.includes('unique constraint')) {
        return failure('Sort order collision - please try again', 'DATABASE_ERROR');
      }
    }
    
    return failure('Failed to create sibling block', 'DATABASE_ERROR');
  }
}

// ============================================================================
// Legacy exports for backward compatibility
// ============================================================================

interface SyncBlocksPayload {
  documentId: string;
  blocks: Array<{
    blockId: string;
    type: string;
    content: Record<string, unknown>;
    sortOrder: string;
    parentPath: string;
    documentId: string;
  }>;
  deletedBlockIds: string[];
}

export async function syncBlocks(
  payload: SyncBlocksPayload
): Promise<ActionResult<{ upserted: number; deleted: number }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // For legacy compatibility, we'll use the blocks_v3 table
    // but need to map documentId to workspace_id
    // Since we can't easily map, we'll skip validation for now
    // and just check user authentication

    // Using Kysely for upsert into blocks_v3
    // Note: This is a simplified implementation for backward compatibility
    // In production, you'd need proper mapping between document and workspace
    for (const block of payload.blocks) {
      await db
        .insertInto('blocks_v3')
        .values({
          id: block.blockId,
          workspace_id: payload.documentId, // Using documentId as workspace_id
          user_id: user.id,
          parent_id: null,
          path: '.',
          type: block.type as any,
          sort_order: block.sortOrder,
          content: JSON.stringify(block.content),
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict((oc) => oc
          .column('id')
          .doUpdateSet((eb) => ({
            content: eb.ref('excluded.content'),
            sort_order: eb.ref('excluded.sort_order'),
            type: eb.ref('excluded.type'),
            updated_at: new Date()
          }))
        )
        .execute();
    }

    // Delete blocks
    if (payload.deletedBlockIds.length > 0) {
      await db
        .deleteFrom('blocks_v3')
        .where('id', 'in', payload.deletedBlockIds)
        .execute();
    }

    return {
      success: true,
      data: {
        upserted: payload.blocks.length,
        deleted: payload.deletedBlockIds.length
      }
    };
  } catch (error) {
    console.error('[syncBlocks] error:', error);
    return { success: false, error: 'Failed to sync blocks' };
  }
}

export async function getDocumentBlocks(
  documentId: string
): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // For legacy compatibility, treat documentId as workspace_id
    const blocks = await db
      .selectFrom('blocks_v3')
      .selectAll()
      .where('workspace_id', '=', documentId)
      .orderBy('sort_order', 'asc')
      .execute();

    return {
      success: true,
      data: blocks
    };
  } catch (error) {
    console.error('[getDocumentBlocks] error:', error);
    return { success: false, error: 'Failed to fetch blocks' };
  }
}

export async function reorderBlock(
  input: { blockId: string; documentId: string; newSortOrder: string }
): Promise<ActionResult<{ sortOrder: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Update the block's sort_order in blocks_v3
    await db
      .updateTable('blocks_v3')
      .set({ sort_order: input.newSortOrder })
      .where('id', '=', input.blockId)
      .execute();

    return {
      success: true,
      data: { sortOrder: input.newSortOrder }
    };
  } catch (error) {
    console.error('[reorderBlock] error:', error);
    return { success: false, error: 'Failed to reorder block' };
  }
}

export async function upsertBlock(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    // For now, delegate to createBlockAction
    // In a real implementation, this would check if block exists and update
    return await createBlockAction(input);
  } catch (error) {
    console.error('[upsertBlock] error:', error);
    return { success: false, error: 'Failed to upsert block' };
  }
}

// deleteBlock is already exported as deleteBlockAction, but we need a version
// that matches the expected signature (blockId: string)
export async function deleteBlock(
  blockId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Get workspace_id for revalidation
    const block = await db
      .selectFrom('blocks_v3')
      .select('workspace_id')
      .where('id', '=', blockId)
      .executeTakeFirst();

    await db
      .deleteFrom('blocks_v3')
      .where('id', '=', blockId)
      .execute();

    if (block?.workspace_id) {
      revalidatePath(`/workspace/${block.workspace_id}`);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteBlock] error:', error);
    return { success: false, error: 'Failed to delete block' };
  }
}
