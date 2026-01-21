'use client';

/**
 * Lead List Widget
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * A fully functional widget that displays CRM leads with:
 * - Real-time data fetching via TanStack Query
 * - Status updates with optimistic UI
 * - Error handling and access denied states
 * - Loading skeletons
 * - Refresh capability
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useLeads, useUpdateLeadStatus, useRefreshLeads, useSeedSampleLeads } from '../hooks/useLeads';
import { WidgetErrorBoundary } from '@/modules/editor/components/WidgetErrorBoundary';
import { AccessDeniedState } from '@/modules/editor/components/AccessDeniedState';
import { LeadListSkeleton } from '@/modules/editor/components/WidgetSkeleton';
import {
    type Lead,
    type LeadStatus,
    type LeadListWidgetConfig
} from '../types';
import { LeadStatusBadge } from './LeadStatusBadge';
import { cn } from '@/lib/utils';
import { LeadsEmptyState } from '@/components/ui/empty-states';

// ============================================================
// Props Interface
// ============================================================

interface LeadListWidgetProps {
    config?: LeadListWidgetConfig;
    className?: string;
}

// ============================================================
// Main Widget Component
// ============================================================

export function LeadListWidget({ config = {}, className }: LeadListWidgetProps) {
    const {
        title = 'CRM Leads',
        showValue = true,
        showCompany = true,
        filterStatus,
        maxItems = 10,
    } = config;

    // Fetch leads with optional status filter
    const {
        data,
        isLoading,
        isError,
        error,
        isFetching,
    } = useLeads({
        filters: filterStatus ? { status: filterStatus } : undefined,
        limit: maxItems,
        orderBy: 'updated_at',
        orderDirection: 'desc',
    });

    const { refresh } = useRefreshLeads();
    const seedMutation = useSeedSampleLeads();

    // Handle seed sample data
    const handleSeedData = async () => {
        await seedMutation.mutateAsync();
    };

    // Check for access denied (RLS failure)
    if (isError) {
        const errorMessage = error?.message || 'Unknown error';

        if (errorMessage.includes('Access denied') || errorMessage.includes('FORBIDDEN')) {
            return (
                <AccessDeniedState
                    widgetType="CRM Leads"
                    title="CRM Access Restricted"
                    message="You don't have permission to view CRM leads in this workspace."
                />
            );
        }

        // Other errors - show in error boundary style
        return (
            <div className={cn('w-full', className)}>
                <WidgetHeader
                    title={title}
                    isRefreshing={false}
                    onRefresh={refresh}
                />
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        Failed to load leads: {errorMessage}
                    </p>
                    <button
                        onClick={refresh}
                        className="mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return <LeadListSkeleton />;
    }

    const leads = data?.data || [];

    return (
        <WidgetErrorBoundary widgetType="CRM Leads">
            <div className={cn('w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', className)}>
                {/* Header */}
                <WidgetHeader
                    title={title}
                    count={data?.count}
                    isRefreshing={isFetching && !isLoading}
                    onRefresh={refresh}
                />

                {/* Content */}
                {leads.length === 0 ? (
                    <LeadsEmptyState
                        onSeedData={handleSeedData}
                        isSeeding={seedMutation.isPending}
                    />
                ) : (
                    <LeadTable
                        leads={leads}
                        showValue={showValue}
                        showCompany={showCompany}
                    />
                )}
            </div>
        </WidgetErrorBoundary>
    );
}

// ============================================================
// Sub-Components
// ============================================================

interface WidgetHeaderProps {
    title: string;
    count?: number;
    isRefreshing: boolean;
    onRefresh: () => void;
}

function WidgetHeader({ title, count, isRefreshing, onRefresh }: WidgetHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
                {/* Icon */}
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                    <svg
                        className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                    </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {title}
                </h3>
                {count !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({count})
                    </span>
                )}
            </div>

            {/* Refresh Button */}
            <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={cn(
                    'p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    isRefreshing && 'opacity-50 cursor-not-allowed'
                )}
                title="Refresh leads"
            >
                <svg
                    className={cn('w-4 h-4 text-gray-500 dark:text-gray-400', isRefreshing && 'animate-spin')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            </button>
        </div>
    );
}


interface LeadTableProps {
    leads: Lead[];
    showValue: boolean;
    showCompany: boolean;
}

function LeadTable({ leads, showValue, showCompany }: LeadTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Name
                        </th>
                        {showCompany && (
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Company
                            </th>
                        )}
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                        </th>
                        {showValue && (
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Value
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {leads.map((lead) => (
                        <LeadRow
                            key={lead.id}
                            lead={lead}
                            showValue={showValue}
                            showCompany={showCompany}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface LeadRowProps {
    lead: Lead;
    showValue: boolean;
    showCompany: boolean;
}

function LeadRow({ lead, showValue, showCompany }: LeadRowProps) {

    // Get initials for avatar
    const initials = lead.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
            {/* Name & Email */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {initials}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {lead.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {lead.email}
                        </p>
                    </div>
                </div>
            </td>

            {/* Company */}
            {showCompany && (
                <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {lead.company || '—'}
                    </p>
                </td>
            )}

            {/* Status (Clickable) */}
            <td className="px-4 py-3">
                <LeadStatusBadge
                    leadId={lead.id}
                    currentStatus={lead.status}
                />
            </td>

            {/* Value */}
            {showValue && (
                <td className="px-4 py-3 text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ${lead.value.toLocaleString()}
                    </p>
                </td>
            )}
        </tr>
    );
}

// Export default for registry compatibility
export default LeadListWidget;
