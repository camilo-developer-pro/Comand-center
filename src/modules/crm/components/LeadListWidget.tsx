// src/modules/crm/components/LeadListWidget.tsx
'use client'

import { useState } from 'react'
import { useLeads, useUpdateLeadStatus } from '../hooks/useLeads'
import { LeadStatusBadge } from './LeadStatusBadge'
import { AccessDenied } from './AccessDenied'
import { LeadListSkeleton } from './LeadListSkeleton'
import { LeadStatusFilter, Lead } from '../types'
import { cn } from '@/lib/utils'
import { Users, DollarSign, RefreshCw } from 'lucide-react'

import { useWorkspace } from '@/modules/core/hooks/useWorkspace'
import { BaseWidgetProps } from '@/modules/editor/registry'

// Status cycle for click-to-change functionality
const statusCycle: Exclude<LeadStatusFilter, 'all'>[] = ['new', 'contacted', 'qualified', 'lost']

function getNextStatus(current: string): Exclude<LeadStatusFilter, 'all'> {
    // Lead status from DB might be lowercase or something else, but we mapped it in LeadStatusFilter
    const status = current.toLowerCase() as Exclude<LeadStatusFilter, 'all'>
    const currentIndex = statusCycle.indexOf(status)
    return statusCycle[(currentIndex + 1) % statusCycle.length]
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

export function LeadListWidget({
    workspaceId: propsWorkspaceId,
    config,
    readOnly = false
}: BaseWidgetProps & { workspaceId?: string }) {
    const { workspaceId: contextWorkspaceId } = useWorkspace()
    const workspaceId = propsWorkspaceId || contextWorkspaceId

    const filterStatus = (config?.filterStatus as LeadStatusFilter) || 'all'
    const limit = (config?.limit as number) || 10

    const { data: leads, isLoading, error, refetch, isRefetching } = useLeads(workspaceId || '', filterStatus)
    const updateStatus = useUpdateLeadStatus()
    const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)

    if (!workspaceId) {
        return (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Workspace context is missing.
                </p>
            </div>
        )
    }

    // Handle permission errors with Access Denied UI
    if (error) {
        const errorWithCode = error as Error & { code?: string }

        if (errorWithCode.code === 'FORBIDDEN' || errorWithCode.code === 'UNAUTHORIZED') {
            return <AccessDenied message={error.message} />
        }

        // Generic error state
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                    Failed to load leads: {error.message}
                </p>
                <button
                    onClick={() => refetch()}
                    className="mt-2 text-xs text-red-700 dark:text-red-300 underline hover:no-underline"
                >
                    Try again
                </button>
            </div>
        )
    }

    // Loading state
    if (isLoading) {
        return <LeadListSkeleton />
    }

    const handleStatusClick = async (lead: Lead) => {
        if (updatingLeadId || readOnly) return // Prevent concurrent updates or read-only interaction

        const newStatus = getNextStatus(lead.status)
        setUpdatingLeadId(lead.id)

        try {
            await updateStatus.mutateAsync({ leadId: lead.id, newStatus })
        } catch (err) {
            console.error('Failed to update lead status:', err)
        } finally {
            setUpdatingLeadId(null)
        }
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        CRM Leads
                    </span>
                    {filterStatus !== 'all' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({filterStatus})
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className={cn('w-4 h-4 text-gray-500', isRefetching && 'animate-spin')} />
                </button>
            </div>

            {/* Lead List */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {leads && leads.length > 0 ? (
                    leads.slice(0, limit).map((lead) => (
                        <div
                            key={lead.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {lead.first_name} {lead.last_name}
                                </p>
                                {lead.email && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {lead.email}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                                <LeadStatusBadge
                                    status={lead.status.toLowerCase() as Exclude<LeadStatusFilter, 'all'>}
                                    onClick={!readOnly ? () => handleStatusClick(lead) : undefined}
                                    isLoading={updatingLeadId === lead.id}
                                />
                                {/* Value field not present in current schema */}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No leads found
                    </div>
                )}
            </div>

            {/* Footer */}
            {leads && leads.length > limit && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Showing {limit} of {leads.length} leads
                    </p>
                </div>
            )}
        </div>
    )
}

export default LeadListWidget
