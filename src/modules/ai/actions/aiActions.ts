'use server';

/**
 * AI Module Server Actions
 * 
 * V2.0 Phase 2: Semantic Brain
 * 
 * Orchestrates the full RAG pipeline:
 * 1. Ingestion: BlockNote -> Markdown -> Chunks -> Embeddings -> DB
 * 2. Search: Query -> Embedding -> Vector Search -> Results
 */

import { createClient } from '@/lib/supabase/server';
import { processDocument, enrichChunkContent } from '../utils/processDocument';
import { embedDocumentChunks } from '../services/embeddingService';
import { matchDocuments } from '../queries/matchDocuments';
import { generateEmbedding } from '../lib/openai';
import type {
    BlockNoteJSON,
    IngestDocumentResult,
    MatchDocumentsResult,
    EmbeddingRecord
} from '../types';

/**
 * Ingests a BlockNote document into the vector store.
 * Deletes old embeddings for the same document before inserting new ones.
 */
export async function ingestDocument(
    documentId: string,
    workspaceId: string,
    content: BlockNoteJSON
): Promise<IngestDocumentResult> {
    const supabase = await createClient();

    try {
        // 1. Process Document (Validation -> Markdown -> Chunks)
        const processed = processDocument(documentId, workspaceId, content);

        if (processed.chunks.length === 0) {
            return { success: true, data: { chunksCreated: 0, totalChars: 0 } };
        }

        // 2. Generate embeddings
        // We use the raw chunks for the database records, but we could 
        // optionally enrich the content before embedding for better retrieval
        const chunksToEmbed = processed.chunks.map(chunk => ({
            ...chunk,
            content: enrichChunkContent(chunk) // Add breadcrumbs to the text being embedded
        }));

        const embeddedChunks = await embedDocumentChunks(chunksToEmbed);

        // 3. Update Database
        const { error: deleteError } = await supabase.rpc('delete_document_embeddings', {
            target_document_id: documentId
        });

        if (deleteError) {
            console.error('[AI Action] Delete error:', deleteError);
            return { success: false, error: 'Failed to clean up old embeddings', code: 'PROCESSING_ERROR' };
        }

        // 4. Insert new embeddings
        const records: EmbeddingRecord[] = embeddedChunks.map(chunk => ({
            document_id: documentId,
            workspace_id: workspaceId,
            chunk_index: chunk.chunkIndex,
            content: processed.chunks[chunk.chunkIndex].content, // Store original content
            embedding: chunk.embedding,
            header_path: chunk.headerPath,
            metadata: {
                heading_level: chunk.headingLevel,
                char_count: chunk.charCount,
                processed_at: processed.processedAt.toISOString()
            }
        }));

        const { error: insertError } = await supabase
            .from('document_embeddings')
            .insert(records);

        if (insertError) {
            console.error('[AI Action] Insert error:', insertError);
            return { success: false, error: 'Failed to save embeddings', code: 'PROCESSING_ERROR' };
        }

        const totalChars = processed.chunks.reduce((sum: number, c) => sum + c.charCount, 0);
        return {
            success: true,
            data: {
                chunksCreated: processed.chunks.length,
                totalChars
            }
        };

    } catch (error) {
        console.error('[AI Action] Ingestion failed:', error);
        return { success: false, error: 'An unexpected error occurred during ingestion', code: 'PROCESSING_ERROR' };
    }
}

/**
 * Searches for documents semantically related to the query.
 */
export async function searchDocuments(
    workspaceId: string,
    query: string,
    limit: number = 5
): Promise<MatchDocumentsResult> {
    const supabase = await createClient();

    try {
        // 1. Generate query embedding
        const queryEmbedding = await generateEmbedding(query);

        // 2. Perform vector search using the refined wrapper
        return await matchDocuments({
            query_embedding: queryEmbedding,
            workspace_id: workspaceId,
            match_count: limit,
            match_threshold: 0.5 // Default threshold for general search
        });

    } catch (error) {
        console.error('[AI Action] Search failed:', error);
        return { success: false, error: 'An unexpected error occurred during search', code: 'PROCESSING_ERROR' };
    }
}
