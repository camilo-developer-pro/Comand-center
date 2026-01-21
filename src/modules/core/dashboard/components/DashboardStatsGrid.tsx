'use client';

/**
 * Dashboard Stats Grid Component
 * 
 * V2.0: Renders all KPI cards with data from Materialized View
 * Implements SWR pattern for instant data display
 */

import { useDashboardStats } from '../hooks/useDashboardStats';
import { KPICard } from './KPICard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, DollarSign, FileText, Users, Trophy } from 'lucide-react';

interface DashboardStatsGridProps {
    workspaceId: string;
}

// Utility: Format currency
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

// Utility: Format relative time
function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export function DashboardStatsGrid({ workspaceId }: DashboardStatsGridProps) {
    const {
        data,
        isLoading,
        isError,
        error,
        isStale,
        isFetching,
        lastRefreshedAt,
        manualRefresh,
    } = useDashboardStats({ workspaceId });

    if (isError) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                    Failed to load dashboard: {error?.message || 'Unknown error'}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={manualRefresh}
                >
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with refresh info */}
            <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    Last updated: {formatRelativeTime(lastRefreshedAt)}
                    {isStale && ' (refreshing...)'}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={manualRefresh}
                    disabled={isFetching}
                    className="h-8 px-2"
                >
                    <RefreshCw className={cn(
                        'h-4 w-4',
                        isFetching && 'animate-spin'
                    )} />
                </Button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Pipeline Value"
                    value={formatCurrency(data?.totalPipelineValue ?? 0)}
                    subtitle="Active opportunities"
                    icon={<DollarSign />}
                    isLoading={isLoading}
                    isStale={isStale}
                />

                <KPICard
                    title="Won Revenue"
                    value={formatCurrency(data?.totalWonValue ?? 0)}
                    subtitle="Closed deals"
                    icon={<Trophy />}
                    isLoading={isLoading}
                    isStale={isStale}
                />

                <KPICard
                    title="Total Leads"
                    value={data?.totalLeads ?? 0}
                    subtitle={`${data?.newLeadsCount ?? 0} new this period`}
                    icon={<Users />}
                    isLoading={isLoading}
                    isStale={isStale}
                />

                <KPICard
                    title="Documents"
                    value={data?.totalDocuments ?? 0}
                    subtitle={`${data?.activeDocumentsCount ?? 0} active`}
                    icon={<FileText />}
                    isLoading={isLoading}
                    isStale={isStale}
                />
            </div>
        </div>
    );
}
