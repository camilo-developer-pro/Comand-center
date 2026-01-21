/**
 * Document Module Types
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * Type definitions for documents and related entities.
 */

// ============================================================
// Document Types
// ============================================================

export interface Document {
    id: string;
    title: string;
    content: unknown; // JSONB - BlockNote content
    workspace_id: string;
    created_by: string;
    widget_index: string[] | null; // Generated column
    search_vector: string | null; // Generated column (tsvector)
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface DocumentInsert {
    title: string;
    content?: unknown;
    workspace_id: string;
    created_by: string;
    is_archived?: boolean;
}

export interface DocumentUpdate {
    title?: string;
    content?: unknown;
    is_archived?: boolean;
}

// ============================================================
// Query Types
// ============================================================

export type DocumentSortBy = 'created_at' | 'updated_at' | 'title';

export interface DocumentFilters {
    isArchived?: boolean;
    search?: string;
}

export interface DocumentQueryOptions {
    filters?: DocumentFilters;
    sortBy?: DocumentSortBy;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// ============================================================
// API Response Types
// ============================================================

export type DocumentActionResult<T = Document> =
    | { success: true; data: T }
    | { success: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UNKNOWN' };

export type DocumentsQueryResult =
    | { success: true; data: Document[]; count: number }
    | { success: false; error: string; code?: string };
