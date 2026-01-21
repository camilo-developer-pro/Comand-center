'use client';

/**
 * Dashboard Stats Hook
 * 
 * V2.0: Implements Stale-While-Revalidate pattern
 * 
 * Behavior:
 * 1. Returns cached data IMMEDIATELY (even if stale)
 * 2. Fetches fresh data in background
 * 3. Updates UI when fresh data arrives
 * 4. Shows "stale" indicator if data is older than staleTime
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getDashboardStatsFromMV, refreshDashboardStatsMV } from '../actions/dashboardActions';
import type { DashboardStatsFromMV } from '../types';

// ============================================================
// Query Keys
// ============================================================

export const dashboardKeys = {
    all: ['dashboard'] as const,
    stats: () => [...dashboardKeys.all, 'stats'] as const,
    workspaceStats: (workspaceId: string) =>
        [...dashboardKeys.stats(), workspaceId] as const,
};

// ============================================================
// Configuration
// ============================================================

const STALE_TIME = 30 * 1000;        // 30 seconds - data considered fresh
const GC_TIME = 5 * 60 * 1000;       // 5 minutes - cache retention
const REFETCH_INTERVAL = 60 * 1000;  // 60 seconds - background polling

// ============================================================
// Hook
// ============================================================

export interface UseDashboardStatsOptions {
    workspaceId: string;
    enabled?: boolean;
}

export interface UseDashboardStatsResult {
    data: DashboardStatsFromMV | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    isStale: boolean;
    isFetching: boolean;
    lastRefreshedAt: Date | null;
    refetch: () => void;
    manualRefresh: () => Promise<void>;
}

export function useDashboardStats({
    workspaceId,
    enabled = true,
}: UseDashboardStatsOptions): UseDashboardStatsResult {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: dashboardKeys.workspaceStats(workspaceId),
        queryFn: async () => {
            const result = await getDashboardStatsFromMV(workspaceId);

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch dashboard stats');
            }

            return result.data!;
        },
        enabled: enabled && !!workspaceId,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchInterval: REFETCH_INTERVAL,
        refetchOnWindowFocus: true,
        // SWR Behavior: Keep showing old data while fetching new
        placeholderData: (previousData) => previousData,
    });

    // Calculate if data is stale (for UI indicator)
    const isStale = useMemo(() => {
        if (!query.data?.lastRefreshedAt) return false;
        const refreshedAt = new Date(query.data.lastRefreshedAt);
        const now = new Date();
        const ageMs = now.getTime() - refreshedAt.getTime();
        return ageMs > STALE_TIME;
    }, [query.data?.lastRefreshedAt]);

    // Parse last refreshed timestamp
    const lastRefreshedAt = useMemo(() => {
        if (!query.data?.lastRefreshedAt) return null;
        return new Date(query.data.lastRefreshedAt);
    }, [query.data?.lastRefreshedAt]);

    // Manual refresh (triggers MV refresh + refetch)
    const manualRefresh = useCallback(async () => {
        await refreshDashboardStatsMV();
        await queryClient.invalidateQueries({
            queryKey: dashboardKeys.workspaceStats(workspaceId),
        });
    }, [queryClient, workspaceId]);

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        isStale,
        isFetching: query.isFetching,
        lastRefreshedAt,
        refetch: query.refetch,
        manualRefresh,
    };
}
