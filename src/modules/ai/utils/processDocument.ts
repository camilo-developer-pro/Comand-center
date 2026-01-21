/**
 * Document Processor
 * 
 * V2.0 Phase 2: Intelligent Editor
 * 
 * Orchestrates the full document processing pipeline:
 * BlockNote JSON → Markdown → Semantic Chunks
 */

import type { Block } from '@blocknote/core';
import type {
    BlockNoteJSON,
    ProcessedDocument,
    DocumentChunk
} from '../types';
import { blockNoteToMarkdown } from './blockNoteToMarkdown';
import { chunkMarkdownByHeaders, getTotalChunkChars } from './markdownChunker';

// ============================================================
// Validation
// ============================================================

/**
 * Validates that the input is a valid BlockNote JSON structure
 */
function isValidBlockNoteJSON(json: unknown): json is BlockNoteJSON {
    if (!Array.isArray(json)) {
        return false;
    }

    // Check first few items have expected shape
    return json.slice(0, 3).every((item) => {
        if (typeof item !== 'object' || item === null) {
            return false;
        }
        // BlockNote blocks must have id and type
        return 'id' in item && 'type' in item;
    });
}

// ============================================================
// Processing Options
// ============================================================

export interface ProcessDocumentOptions {
    /**
     * Minimum characters for a chunk to be included
     * Default: 10
     */
    minChunkChars?: number;

    /**
     * Maximum characters per chunk before splitting
     * Default: 2000
     */
    maxChunkChars?: number;

    /**
     * Whether to include header text in chunk content
     * Default: true
     */
    includeHeaderInContent?: boolean;
}

// ============================================================
// Main Processor
// ============================================================

/**
 * Processes a BlockNote JSON document into semantic chunks.
 * 
 * This is the main entry point for the ingestion pipeline.
 * 
 * @param documentId - The UUID of the document being processed
 * @param workspaceId - The workspace UUID for security context
 * @param json - The BlockNote JSON content (documents.content)
 * @param options - Processing configuration
 * @returns ProcessedDocument with chunks ready for embedding
 * 
 * @throws Error if json is not valid BlockNote format
 * 
 * @example
 * const processed = processDocument(
 *   doc.id,
 *   doc.workspace_id,
 *   doc.content as Block[]
 * );
 * console.log(processed.chunks.length); // Number of semantic chunks
 */
export function processDocument(
    documentId: string,
    workspaceId: string,
    json: BlockNoteJSON | unknown,
    options: ProcessDocumentOptions = {}
): ProcessedDocument {
    // Validate inputs
    if (!documentId || typeof documentId !== 'string') {
        throw new Error('processDocument: documentId is required');
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
        throw new Error('processDocument: workspaceId is required');
    }

    // Handle null/empty content
    if (!json || (Array.isArray(json) && json.length === 0)) {
        return {
            documentId,
            workspaceId,
            markdown: '',
            chunks: [],
            totalChars: 0,
            processedAt: new Date(),
        };
    }

    // Validate BlockNote structure
    if (!isValidBlockNoteJSON(json)) {
        throw new Error('processDocument: Invalid BlockNote JSON structure');
    }

    // Step 1: Convert to Markdown
    const markdown = blockNoteToMarkdown(json as BlockNoteJSON);

    // Step 2: Chunk by headers
    const chunks = chunkMarkdownByHeaders(markdown, {
        minChunkChars: options.minChunkChars,
        maxChunkChars: options.maxChunkChars,
        includeHeaderInContent: options.includeHeaderInContent,
    });

    // Calculate total chars
    const totalChars = getTotalChunkChars(chunks);

    return {
        documentId,
        workspaceId,
        markdown,
        chunks,
        totalChars,
        processedAt: new Date(),
    };
}

/**
 * Prepares chunks for database insertion.
 * Adds document and workspace context to each chunk.
 */
export function prepareChunksForStorage(
    processed: ProcessedDocument
): Array<Omit<import('../types').EmbeddingRecord, 'embedding'>> {
    return processed.chunks.map((chunk) => ({
        document_id: processed.documentId,
        workspace_id: processed.workspaceId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        header_path: chunk.headerPath,
        metadata: {
            heading_level: chunk.headingLevel,
            char_count: chunk.charCount,
            processed_at: processed.processedAt.toISOString(),
        },
    }));
}

/**
 * Enriches chunk content with header path context for better embeddings.
 * 
 * Example: "Budget" becomes "Document > Marketing > Budget: Budget content..."
 */
export function enrichChunkContent(
    chunk: DocumentChunk,
    documentTitle?: string
): string {
    const pathParts: string[] = [];

    if (documentTitle) {
        pathParts.push(`Document: ${documentTitle}`);
    }

    if (chunk.headerPath.length > 0) {
        pathParts.push(`Section: ${chunk.headerPath.join(' > ')}`);
    }

    const prefix = pathParts.length > 0
        ? pathParts.join(' | ') + '\n\n'
        : '';

    return prefix + chunk.content;
}
