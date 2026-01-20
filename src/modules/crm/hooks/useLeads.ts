'use client';

/**
 * CRM Lead Hooks
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * TanStack Query hooks for fetching and mutating CRM leads.
 * Provides caching, background refetching, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getLeads,
    getLead,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    getLeadStats,
    seedSampleLeads,
} from '../actions/leadActions';
import type {
    Lead,
    LeadInsert,
    LeadUpdate,
    LeadQueryOptions,
    LeadStatus,
} from '../types';

// ============================================================
// Query Keys
// ============================================================

export const leadKeys = {
    all: ['leads'] as const,
    lists: () => [...leadKeys.all, 'list'] as const,
    list: (options: LeadQueryOptions) => [...leadKeys.lists(), options] as const,
    details: () => [...leadKeys.all, 'detail'] as const,
    detail: (id: string) => [...leadKeys.details(), id] as const,
    stats: () => [...leadKeys.all, 'stats'] as const,
};

// ============================================================
// Query Hooks
// ============================================================

/**
 * Hook to fetch leads with optional filtering
 */
export function useLeads(options: LeadQueryOptions = {}) {
    return useQuery({
        queryKey: leadKeys.list(options),
        queryFn: async () => {
            const result = await getLeads(options);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result;
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    });
}

/**
 * Hook to fetch a single lead
 */
export function useLead(leadId: string | null) {
    return useQuery({
        queryKey: leadKeys.detail(leadId || ''),
        queryFn: async () => {
            if (!leadId) {
                throw new Error('Lead ID is required');
            }

            const result = await getLead(leadId);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        enabled: !!leadId,
        staleTime: 30 * 1000,
    });
}

/**
 * Hook to fetch lead statistics
 */
export function useLeadStats() {
    return useQuery({
        queryKey: leadKeys.stats(),
        queryFn: async () => {
            const result = await getLeadStats();

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        staleTime: 60 * 1000, // 1 minute
    });
}

// ============================================================
// Mutation Hooks
// ============================================================

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: LeadInsert) => {
            const result = await createLead(input);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        onSuccess: () => {
            // Invalidate all lead queries
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
        },
    });
}

/**
 * Hook to update a lead
 */
export function useUpdateLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ leadId, updates }: { leadId: string; updates: LeadUpdate }) => {
            const result = await updateLead(leadId, updates);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        onMutate: async ({ leadId, updates }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: leadKeys.detail(leadId) });
            await queryClient.cancelQueries({ queryKey: leadKeys.lists() });

            // Snapshot previous values
            const previousLead = queryClient.getQueryData<Lead>(leadKeys.detail(leadId));

            // Optimistically update the lead
            if (previousLead) {
                queryClient.setQueryData<Lead>(leadKeys.detail(leadId), {
                    ...previousLead,
                    ...updates,
                    updated_at: new Date().toISOString(),
                });
            }

            return { previousLead };
        },
        onError: (err, { leadId }, context) => {
            // Rollback on error
            if (context?.previousLead) {
                queryClient.setQueryData(leadKeys.detail(leadId), context.previousLead);
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
        },
    });
}

/**
 * Hook to update lead status (optimized for quick status changes)
 */
export function useUpdateLeadStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
            const result = await updateLeadStatus(leadId, status);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        onMutate: async ({ leadId, status }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: leadKeys.lists() });

            // Get all cached list queries
            const queryCache = queryClient.getQueryCache();
            const listQueries = queryCache.findAll({ queryKey: leadKeys.lists() });

            // Store previous values for rollback
            const previousData: Map<string, unknown> = new Map();

            // Optimistically update all list caches
            listQueries.forEach((query) => {
                const data = query.state.data as { success: boolean; data: Lead[]; count: number } | undefined;

                if (data?.success && data.data) {
                    previousData.set(JSON.stringify(query.queryKey), data);

                    queryClient.setQueryData(query.queryKey, {
                        ...data,
                        data: data.data.map((lead) =>
                            lead.id === leadId
                                ? { ...lead, status, updated_at: new Date().toISOString() }
                                : lead
                        ),
                    });
                }
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // Rollback all caches on error
            if (context?.previousData) {
                context.previousData.forEach((data, key) => {
                    queryClient.setQueryData(JSON.parse(key), data);
                });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
        },
    });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (leadId: string) => {
            const result = await deleteLead(leadId);

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        onMutate: async (leadId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: leadKeys.lists() });

            // Get all cached list queries
            const queryCache = queryClient.getQueryCache();
            const listQueries = queryCache.findAll({ queryKey: leadKeys.lists() });

            // Store previous values
            const previousData: Map<string, unknown> = new Map();

            // Optimistically remove from all list caches
            listQueries.forEach((query) => {
                const data = query.state.data as { success: boolean; data: Lead[]; count: number } | undefined;

                if (data?.success && data.data) {
                    previousData.set(JSON.stringify(query.queryKey), data);

                    queryClient.setQueryData(query.queryKey, {
                        ...data,
                        data: data.data.filter((lead) => lead.id !== leadId),
                        count: Math.max(0, data.count - 1),
                    });
                }
            });

            return { previousData };
        },
        onError: (err, leadId, context) => {
            // Rollback on error
            if (context?.previousData) {
                context.previousData.forEach((data, key) => {
                    queryClient.setQueryData(JSON.parse(key), data);
                });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
        },
    });
}

/**
 * Hook to seed sample leads
 */
export function useSeedSampleLeads() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const result = await seedSampleLeads();

            if (!result.success) {
                throw new Error(result.error);
            }

            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
        },
    });
}

// ============================================================
// Utility Hooks
// ============================================================

/**
 * Hook to manually refresh leads
 */
export function useRefreshLeads() {
    const queryClient = useQueryClient();

    return {
        refresh: () => {
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
        },
        refreshList: (options?: LeadQueryOptions) => {
            if (options) {
                queryClient.invalidateQueries({ queryKey: leadKeys.list(options) });
            } else {
                queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
            }
        },
    };
}
