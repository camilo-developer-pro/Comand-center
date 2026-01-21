'use client';

/**
 * Search Hook
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchDocuments } from '../actions/searchActions';

export function useDocumentSearch(query: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['search', 'documents', query],
        queryFn: () => searchDocuments({ query }),
        enabled: query.length >= 2 && (options?.enabled ?? true),
        staleTime: 60 * 1000, // 1 minute
        placeholderData: keepPreviousData, // Smooth transition between searches
    });
}
