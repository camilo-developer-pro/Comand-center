import { generateBatchEmbeddings } from '../lib/openai';
import type { DocumentChunk, EmbeddedChunk } from '../types';

/**
 * Embedding Service
 * 
 * V2.0 Phase 2: Semantic Brain
 * 
 * Handles the generation of embeddings for document chunks.
 * Manages batching and mapping metadata.
 */

/**
 * Generates embeddings for an array of document chunks.
 * 
 * @param chunks - Array of document chunks to embed
 * @returns Array of embedded chunks with 1536-dim vectors
 */
export async function embedDocumentChunks(
    chunks: DocumentChunk[]
): Promise<EmbeddedChunk[]> {
    if (chunks.length === 0) return [];

    // Extract text content for embedding
    const texts = chunks.map(chunk => chunk.content);

    try {
        // Generate embeddings in a single batch (OpenAI supports up to 2048 inputs)
        const vectors = await generateBatchEmbeddings(texts);

        // Map vectors back to chunks
        return chunks.map((chunk, index) => ({
            ...chunk,
            embedding: vectors[index],
        }));
    } catch (error) {
        console.error('[EmbeddingService] Failed to embed chunks:', error);
        throw error;
    }
}

/**
 * Splits large chunk arrays into batches to stay within API limits
 * (Though 2048 is usually enough for a single document)
 */
export async function embedDocumentChunksBatched(
    chunks: DocumentChunk[],
    batchSize: number = 100
): Promise<EmbeddedChunk[]> {
    const results: EmbeddedChunk[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddedBatch = await embedDocumentChunks(batch);
        results.push(...embeddedBatch);
    }

    return results;
}
