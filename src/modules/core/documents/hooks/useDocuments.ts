'use client';

/**
 * Document Hooks
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * TanStack Query hooks for fetching documents.
 * Provides caching, background refetching, and optimistic updates.
 */

import { useQuery } from '@tanstack/react-query';
import {
    getDocuments,
    getRecentDocuments,
    getDocumentCount,
} from '../actions/documentActions';
import type { DocumentFilters } from '../types';

// ============================================================
// Query Keys
// ============================================================

export const documentKeys = {
    all: ['documents'] as const,
    lists: () => [...documentKeys.all, 'list'] as const,
    list: (filters: DocumentFilters) => [...documentKeys.lists(), filters] as const,
    recent: () => [...documentKeys.all, 'recent'] as const,
    count: () => [...documentKeys.all, 'count'] as const,
};

// ============================================================
// Query Hooks
// ============================================================

/**
 * Hook to fetch documents with optional filtering
 */
export function useDocuments(filters: DocumentFilters = {}) {
    return useQuery({
        queryKey: documentKeys.list(filters),
        queryFn: async () => {
            const result = await getDocuments({ filters });

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to fetch recent documents (last 5 modified)
 */
export function useRecentDocuments() {
    return useQuery({
        queryKey: documentKeys.recent(),
        queryFn: async () => {
            const result = await getRecentDocuments();

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to fetch document count
 */
export function useDocumentCount() {
    return useQuery({
        queryKey: documentKeys.count(),
        queryFn: async () => {
            const result = await getDocumentCount();

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}
