'use client';

/**
 * Document Mutation Hooks
 * V1.1 Phase 6: Optimistic UI & Polish
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDocumentTitle } from '../actions/documentActions';
import { documentKeys } from './useDocuments';
import { toast } from 'sonner';
import type { Document, DocumentsQueryResult } from '../types';

/**
 * Hook for optimistic document title updates
 */
export function useUpdateDocumentTitle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ documentId, title }: { documentId: string; title: string }) => {
            const result = await updateDocumentTitle(documentId, title);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        },

        onMutate: async ({ documentId, title }) => {
            // 1. Cancel outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: documentKeys.all });

            // 2. Snapshot all document list caches
            const queryCache = queryClient.getQueryCache();
            const listQueries = queryCache.findAll({ queryKey: documentKeys.lists() });
            const previousData: Map<string, any> = new Map();

            // 3. Optimistically update all list caches
            listQueries.forEach((query) => {
                const data = query.state.data as DocumentsQueryResult | undefined;
                if (data?.success && data.data) {
                    previousData.set(JSON.stringify(query.queryKey), data);

                    queryClient.setQueryData(query.queryKey, {
                        ...data,
                        data: data.data.map((doc) =>
                            doc.id === documentId
                                ? { ...doc, title, updated_at: new Date().toISOString() }
                                : doc
                        ),
                    });
                }
            });

            // 4. Also update recent documents cache if it exists
            const recentData = queryClient.getQueryData<DocumentsQueryResult>(documentKeys.recent());
            if (recentData?.success && recentData.data) {
                previousData.set('recent', recentData);
                queryClient.setQueryData(documentKeys.recent(), {
                    ...recentData,
                    data: recentData.data.map((doc) =>
                        doc.id === documentId
                            ? { ...doc, title, updated_at: new Date().toISOString() }
                            : doc
                    ),
                });
            }

            return { previousData };
        },

        onError: (error, variables, context) => {
            // Rollback all caches on error
            if (context?.previousData) {
                context.previousData.forEach((data, key) => {
                    if (key === 'recent') {
                        queryClient.setQueryData(documentKeys.recent(), data);
                    } else {
                        queryClient.setQueryData(JSON.parse(key), data);
                    }
                });
            }

            // Show error toast
            toast.error('Failed to update title', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },

        onSuccess: () => {
            toast.success('Title updated');
        },

        onSettled: () => {
            // Always refetch to ensure consistency with server state
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}
