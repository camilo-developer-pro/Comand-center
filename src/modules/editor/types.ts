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
