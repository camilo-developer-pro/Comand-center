import type { Block } from '@blocknote/core';

/**
 * Represents a document entity from the database
 */
export interface Document {
    id: string;
    title: string;
    content: Block[] | null;
    workspace_id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Payload for saving document content
 */
export interface SaveDocumentPayload {
    documentId: string;
    content: Block[];
}

/**
 * Payload for updating document title
 */
export interface UpdateTitlePayload {
    documentId: string;
    title: string;
}

/**
 * Response from document operations
 */
export interface DocumentActionResponse {
    success: boolean;
    error?: string;
    data?: Document;
}

/**
 * Represents an atomic block entity
 */
export interface BlockEntity {
    id: string;
    document_id: string;
    content: any;
    type: string;
    sort_order: string;
    parent_path: string;
}

/**
 * Payload for syncing multiple blocks
 */
export interface SyncBlocksPayload {
    documentId: string;
    blocks: BlockEntity[];
}

/**
 * Response from block operations
 */
export interface BlockActionResponse {
    success: boolean;
    error?: string;
    data?: BlockEntity[];
}
