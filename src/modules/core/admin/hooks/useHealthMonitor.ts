'use client';

/**
 * Health Monitor Hooks
 * 
 * TanStack Query hooks for health monitoring data.
 */

import { useQuery } from '@tanstack/react-query';
import {
    getHealthDashboardData,
    getTableStatistics,
    getConnectionStatistics,
    getIndexStatistics,
    getHealthSummary,
    getApiResponseStats,
    getSlowApiRequests,
} from '../actions/healthMonitorActions';

export const healthKeys = {
    all: ['health'] as const,
    dashboard: () => [...healthKeys.all, 'dashboard'] as const,
    tables: () => [...healthKeys.all, 'tables'] as const,
    connections: () => [...healthKeys.all, 'connections'] as const,
    indexes: () => [...healthKeys.all, 'indexes'] as const,
    summary: () => [...healthKeys.all, 'summary'] as const,
    apiStats: (hours: number) => [...healthKeys.all, 'api-stats', hours] as const,
    slowRequests: () => [...healthKeys.all, 'slow-requests'] as const,
};

/**
 * Hook for complete health dashboard data
 */
export function useHealthDashboard(options?: { refetchInterval?: number }) {
    return useQuery({
        queryKey: healthKeys.dashboard(),
        queryFn: async () => {
            const result = await getHealthDashboardData();
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        refetchInterval: options?.refetchInterval || 30000, // 30 seconds default
        staleTime: 10000, // 10 seconds
    });
}

/**
 * Hook for table statistics
 */
export function useTableStats() {
    return useQuery({
        queryKey: healthKeys.tables(),
        queryFn: async () => {
            const result = await getTableStatistics();
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook for connection statistics
 */
export function useConnectionStats() {
    return useQuery({
        queryKey: healthKeys.connections(),
        queryFn: async () => {
            const result = await getConnectionStatistics();
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        refetchInterval: 10000, // 10 seconds
        staleTime: 5000,
    });
}

/**
 * Hook for API response statistics
 */
export function useApiStats(timeWindowHours: number = 24) {
    return useQuery({
        queryKey: healthKeys.apiStats(timeWindowHours),
        queryFn: async () => {
            const result = await getApiResponseStats(timeWindowHours);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        refetchInterval: 30000,
        staleTime: 15000,
    });
}

/**
 * Hook for slow API requests
 */
export function useSlowRequests() {
    return useQuery({
        queryKey: healthKeys.slowRequests(),
        queryFn: async () => {
            const result = await getSlowApiRequests(50);
            if (!result.success) throw new Error(result.error);
            return result.data;
        },
        refetchInterval: 30000,
        staleTime: 15000,
    });
}
