// src/modules/crm/hooks/useLeads.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads } from '../actions/getLeads'
import { updateLeadStatus } from '../actions/updateLead'
import { LeadStatusFilter, Lead } from '../types'

// Query key factory for consistency
export const leadKeys = {
    all: ['crm', 'leads'] as const,
    list: (workspaceId: string, filter: LeadStatusFilter) =>
        [...leadKeys.all, { workspaceId, filter }] as const,
}

export function useLeads(workspaceId: string, filterStatus: LeadStatusFilter = 'all') {
    return useQuery({
        queryKey: leadKeys.list(workspaceId, filterStatus),
        queryFn: async () => {
            const result = await getLeads(workspaceId, filterStatus)

            if (!result.success) {
                // Throw error with code for error boundary handling
                const error = new Error(result.error) as Error & { code: string }
                error.code = result.code
                throw error
            }

            return result.data
        },
        staleTime: 30 * 1000, // 30 seconds
        retry: (failureCount, error) => {
            // Don't retry on permission errors
            if ((error as Error & { code?: string }).code === 'FORBIDDEN' ||
                (error as Error & { code?: string }).code === 'UNAUTHORIZED') {
                return false
            }
            return failureCount < 3
        },
    })
}

export function useUpdateLeadStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            leadId,
            newStatus
        }: {
            leadId: string
            newStatus: Exclude<LeadStatusFilter, 'all'>
        }) => {
            const result = await updateLeadStatus(leadId, newStatus)

            if (!result.success) {
                const error = new Error(result.error) as Error & { code: string }
                error.code = result.code
                throw error
            }

            return result.data
        },
        onSuccess: () => {
            // Invalidate all lead queries to refetch
            queryClient.invalidateQueries({ queryKey: leadKeys.all })
        },
    })
}
