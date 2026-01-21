/**
 * AI Module Types
 * 
 * V2.0 Phase 2: Intelligent Editor
 * 
 * Type definitions for document processing, chunking, and vector operations.
 */

import type { Block } from '@blocknote/core';

// ============================================================
// BlockNote Processing Types
// ============================================================

/**
 * Represents the structure of BlockNote JSON content.
 * This is the raw format stored in documents.content
 */
export type BlockNoteJSON = Block[];

/**
 * Supported block types that contain text content
 */
export type TextBlockType =
    | 'paragraph'
    | 'heading'
    | 'bulletListItem'
    | 'numberedListItem'
    | 'checkListItem'
    | 'quote'
    | 'codeBlock';

/**
 * Heading levels in BlockNote (1, 2, or 3)
 */
export type HeadingLevel = 1 | 2 | 3;

// ============================================================
// Chunking Types
// ============================================================

/**
 * A semantic chunk extracted from a document.
 * Contains the text content and its hierarchical context.
 */
export interface DocumentChunk {
    /** Zero-based index of this chunk within the document */
    chunkIndex: number;

    /** The actual text content of this chunk */
    content: string;

    /** 
     * Breadcrumb path of headers leading to this chunk
     * Example: ["Marketing Plan", "Q3 Budget", "Expenses"]
     */
    headerPath: string[];

    /** 
     * Markdown heading level that started this chunk (1-3)
     * null if chunk is under no heading
     */
    headingLevel: HeadingLevel | null;

    /** Character count of the content */
    charCount: number;
}

/**
 * Result of processing a BlockNote document
 */
export interface ProcessedDocument {
    /** The document ID being processed */
    documentId: string;

    /** Workspace ID for security context */
    workspaceId: string;

    /** Full markdown representation */
    markdown: string;

    /** Array of semantic chunks */
    chunks: DocumentChunk[];

    /** Total character count across all chunks */
    totalChars: number;

    /** Processing timestamp */
    processedAt: Date;
}

// ============================================================
// Embedding Types
// ============================================================

/**
 * A chunk with its computed embedding vector
 */
export interface EmbeddedChunk extends DocumentChunk {
    /** 1536-dimensional embedding vector (OpenAI text-embedding-3-small) */
    embedding: number[];
}

/**
 * Database record for document_embeddings table
 */
export interface EmbeddingRecord {
    id?: string;
    document_id: string;
    workspace_id: string;
    chunk_index: number;
    content: string;
    embedding: number[];
    header_path: string[];
    metadata: {
        heading_level?: number | null;
        char_count?: number;
        processed_at?: string;
    };
}

// ============================================================
// Retrieval Types
// ============================================================

/**
 * Parameters for the match_documents RPC
 */
export interface MatchDocumentsParams {
    /** The query embedding vector (1536 dimensions) */
    query_embedding: number[];

    /** Workspace ID for security filtering (REQUIRED) */
    workspace_id: string;

    /** Number of results to return (default: 5) */
    match_count?: number;

    /** Minimum similarity threshold 0-1 (default: 0.7) */
    match_threshold?: number;
}

/**
 * Result from the match_documents RPC
 */
export interface MatchedDocument {
    id: string;
    document_id: string;
    content: string;
    header_path: string[];
    similarity: number;
    metadata: Record<string, unknown>;
}

// ============================================================
// Action Response Types
// ============================================================

export type AIActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code?: 'UNAUTHORIZED' | 'PROCESSING_ERROR' | 'EMBEDDING_ERROR' };

export type IngestDocumentResult = AIActionResult<{
    chunksCreated: number;
    totalChars: number;
}>;

export type MatchDocumentsResult = AIActionResult<MatchedDocument[]>;
