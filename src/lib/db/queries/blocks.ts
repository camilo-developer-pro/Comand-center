import { db } from '../index';
import type { InsertableTable, SelectableTable, UpdateableTable } from '../index';
import { sql } from 'kysely';

/**
 * Get all blocks for a document, ordered by sort_order
 * Uses COLLATE "C" to ensure consistent ordering with JavaScript
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
 */
export async function insertBlock(
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
 */
export async function updateBlockContent(
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
 * Update block sort order (for reordering)
 */
export async function updateBlockSortOrder(
    blockId: string,
    sortOrder: string
): Promise<void> {
    await db
        .updateTable('blocks')
        .set({ sort_order: sortOrder })
        .where('id', '=', blockId)
        .execute();
}

/**
 * Get blocks with stale embeddings (need re-embedding)
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

/**
 * Semantic search using pgvector
 */
export async function searchBlocksBySimilarity(
    workspaceId: string,
    embedding: number[],
    limit: number = 10
): Promise<Array<SelectableTable<'blocks'> & { similarity: number }>> {
    const embeddingStr = `[${embedding.join(',')}]`;

    return await db
        .selectFrom('blocks')
        .innerJoin('documents', 'documents.id', 'blocks.document_id')
        .where('documents.workspace_id', '=', workspaceId)
        .where('blocks.embedding', 'is not', null)
        .selectAll('blocks')
        .select(
            sql<number>`1 - (blocks.embedding <=> ${embeddingStr}::vector)`.as('similarity')
        )
        .orderBy(sql`blocks.embedding <=> ${embeddingStr}::vector`)
        .limit(limit)
        .execute();
}
