import { db, SelectableTable, InsertableTable } from '../index';
import { sql } from 'kysely';
import type { BlockInsert, BlockUpdate, BlockReorder } from '@/lib/schemas/block.schema';
import { generateUUIDv7 } from '@/lib/utils/uuid';

/**
 * Fetch blocks by parent (for sidebar)
 * Returns blocks for a specific workspace and parent, ordered by sort_order
 */
export async function getBlocksByParent(
  workspaceId: string,
  parentId: string | null
): Promise<SelectableTable<'blocks_v3'>[]> {
  return db
    .selectFrom('blocks_v3')
    .selectAll()
    .where('workspace_id', '=', workspaceId)
    .where('parent_id', parentId === null ? 'is' : '=', parentId)
    .orderBy('sort_order', 'asc')
    .execute();
}

/**
 * Fetch block tree (recursive CTE for full tree)
 * Uses ltree for efficient subtree query when rootId is provided
 */
export async function getBlockTree(
  workspaceId: string,
  rootId: string | null = null
): Promise<SelectableTable<'blocks_v3'>[]> {
  // Use ltree for efficient subtree query
  if (rootId) {
    return db
      .selectFrom('blocks_v3')
      .selectAll()
      .where('workspace_id', '=', workspaceId)
      .where(sql<boolean>`path <@ (SELECT path FROM blocks_v3 WHERE id = ${rootId})`)
      .orderBy('path', 'asc')
      .orderBy('sort_order', 'asc')
      .execute();
  }
  
  // Root level: pages only
  return getBlocksByParent(workspaceId, null);
}

/**
 * Insert a new block
 * Generates UUIDv7 if not provided, uses BlockInsert schema for validation
 * Note: path column is computed by database trigger, but we need to provide a placeholder
 * since the column is NOT NULL. Use empty string as placeholder.
 */
export async function insertBlock(
  block: BlockInsert
): Promise<SelectableTable<'blocks_v3'>> {
  const id = block.id ?? generateUUIDv7();
  
  // Remove any path field if present (should be omitted by schema but double-check)
  const { path: _, ...blockWithoutPath } = block as any;
  
  const [inserted] = await db
    .insertInto('blocks_v3')
    .values({
      ...blockWithoutPath,
      id,
      // Provide placeholder path - trigger will compute actual value
      // Must be non-empty string due to CHECK constraint, but trigger runs BEFORE INSERT
      // and will override this value. Use a single dot as valid ltree placeholder.
      path: '.',
    })
    .returningAll()
    .execute();
  
  return inserted;
}

/**
 * Update block content (debounced from editor)
 * Updates content JSON and sets updated_at timestamp
 */
export async function updateBlockContent(
  blockId: string,
  content: Record<string, unknown>
): Promise<void> {
  await db
    .updateTable('blocks_v3')
    .set({
      content: JSON.stringify(content),
      updated_at: sql`now()`,
    })
    .where('id', '=', blockId)
    .execute();
}

/**
 * Reorder block (uses fractional indexing RPC)
 * Calls PostgreSQL function for new sort_order between prev and next
 */
export async function reorderBlock(
  reorder: BlockReorder
): Promise<string> {
  // Call PostgreSQL function for new sort_order using raw SQL
  const result = await sql<{ new_sort_order: string }>`
    SELECT fi_generate_key_between(
      ${reorder.prev_sort_order}::text,
      ${reorder.next_sort_order}::text
    ) as new_sort_order
  `.execute(db);
  
  const newSortOrder = result.rows[0]?.new_sort_order;
  
  if (!newSortOrder) {
    throw new Error('Failed to generate fractional index key');
  }
  
  await db
    .updateTable('blocks_v3')
    .set({
      parent_id: reorder.new_parent_id,
      sort_order: newSortOrder,
      updated_at: sql`now()`,
    })
    .where('id', '=', reorder.block_id)
    .execute();
  
  return newSortOrder;
}

/**
 * Delete block (cascade handled by FK)
 */
export async function deleteBlock(blockId: string): Promise<void> {
  await db
    .deleteFrom('blocks_v3')
    .where('id', '=', blockId)
    .execute();
}

/**
 * Get blocks by workspace for admin/analytics purposes
 */
export async function getBlocksByWorkspace(
  workspaceId: string,
  limit: number = 100
): Promise<SelectableTable<'blocks_v3'>[]> {
  return db
    .selectFrom('blocks_v3')
    .selectAll()
    .where('workspace_id', '=', workspaceId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .execute();
}

/**
 * Search blocks by text content within a workspace
 * Uses PostgreSQL full-text search on content JSON
 */
export async function searchBlocksByText(
  workspaceId: string,
  query: string,
  limit: number = 20
): Promise<SelectableTable<'blocks_v3'>[]> {
  return db
    .selectFrom('blocks_v3')
    .selectAll()
    .where('workspace_id', '=', workspaceId)
    .where(sql<boolean>`content::text ILIKE ${`%${query}%`}`)
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .execute();
}

/**
 * Update block parent (for drag-and-drop between parents)
 * Triggers path update via blocks_path_trigger_fn()
 */
export async function updateBlockParent(
  blockId: string,
  newParentId: string | null
): Promise<void> {
  await db
    .updateTable('blocks_v3')
    .set({
      parent_id: newParentId,
      updated_at: sql`now()`,
    })
    .where('id', '=', blockId)
    .execute();
}

/**
 * Get block by ID with workspace validation
 */
export async function getBlockById(
  blockId: string,
  workspaceId: string
): Promise<SelectableTable<'blocks_v3'> | null> {
  const block = await db
    .selectFrom('blocks_v3')
    .selectAll()
    .where('id', '=', blockId)
    .where('workspace_id', '=', workspaceId)
    .executeTakeFirst();
  
  return block ?? null;
}

// Legacy functions for backward compatibility (old blocks table)
// These can be deprecated once migration is complete

/**
 * Get all blocks for a document, ordered by sort_order
 * Uses COLLATE "C" to ensure consistent ordering with JavaScript
 * @deprecated Use getBlocksByParent for blocks_v3 table
 */
export async function getBlocksByDocumentId(
  documentId: string
): Promise<SelectableTable<'blocks'>[]> {
  return await db
    .selectFrom('blocks')
    .where('document_id', '=', documentId)
    .orderBy(sql`sort_order COLLATE "C"`)
    .selectAll()
    .execute();
}

/**
 * Insert a new block with UUIDv7 ID
 * @deprecated Use insertBlock for blocks_v3 table
 */
export async function insertBlockLegacy(
  data: InsertableTable<'blocks'>
): Promise<SelectableTable<'blocks'>> {
  return await db
    .insertInto('blocks')
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Update block content (triggers updated_at automatically)
 * @deprecated Use updateBlockContent for blocks_v3 table
 */
export async function updateBlockContentLegacy(
  blockId: string,
  content: unknown,
  contentHash: string
): Promise<SelectableTable<'blocks'>> {
  return await db
    .updateTable('blocks')
    .set({
      content: JSON.stringify(content),
      content_hash: contentHash,
    })
    .where('id', '=', blockId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Get blocks with stale embeddings (need re-embedding)
 * @deprecated Will be replaced with blocks_v3 version
 */
export async function getBlocksNeedingEmbedding(
  documentId: string,
  limit: number = 50
): Promise<SelectableTable<'blocks'>[]> {
  return await db
    .selectFrom('blocks')
    .where('document_id', '=', documentId)
    .where((eb) =>
      eb.or([
        eb('embedding_updated_at', 'is', null),
        eb('embedding_updated_at', '<', eb.ref('updated_at')),
      ])
    )
    .orderBy('updated_at', 'asc')
    .limit(limit)
    .selectAll()
    .execute();
}
