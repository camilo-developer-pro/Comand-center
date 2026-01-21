/**
 * Search Module Types
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

export interface SearchResult {
    id: string;
    title: string;
    titleHighlight: string; // HTML with <mark> tags
    rank: number;
    updatedAt: string;
}

export interface SearchOptions {
    query: string;
    limit?: number;
    offset?: number;
}

export type SearchActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };
