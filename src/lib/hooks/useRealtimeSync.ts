/**
 * Real-time State Synchronization Hooks
 * Command Center V3.0 - Phase 3.2
 *
 * Hooks for subscribing to real-time updates and syncing UI state.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types
interface RealtimePayload<T = unknown> {
    channel: string;
    payload: T;
    timestamp: number;
}

interface DashboardDeltaPayload {
    workspace_id: string;
    delta_folders: number;
    delta_documents: number;
    delta_total: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface StatsUpdatedPayload {
    workspace_id: string;
    version: number;
}

interface EntityChangedPayload {
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    entity_id: string;
    workspace_id: string;
    changed_fields?: Record<string, unknown>;
}

interface GraphChangedPayload {
    operation: 'EDGE_ADDED' | 'EDGE_REMOVED';
    source_id: string;
    target_id: string;
    edge_type: string;
    workspace_id: string;
}

interface UseRealtimeSyncOptions {
    workspaceId: string;
    onDashboardDelta?: (payload: DashboardDeltaPayload) => void;
    onStatsUpdated?: (payload: StatsUpdatedPayload) => void;
    onEntityChanged?: (payload: EntityChangedPayload) => void;
    onGraphChanged?: (payload: GraphChangedPayload) => void;
    onError?: (error: Error) => void;
}

interface RealtimeSyncState {
    isConnected: boolean;
    lastHeartbeat: number | null;
    messageCount: number;
}

/**
 * Hook for subscribing to real-time updates and syncing state
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions) {
    const {
        workspaceId,
        onDashboardDelta,
        onStatsUpdated,
        onEntityChanged,
        onGraphChanged,
        onError
    } = options;

    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [state, setState] = useState<RealtimeSyncState>({
        isConnected: false,
        lastHeartbeat: null,
        messageCount: 0
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Handle dashboard delta (optimistic update)
    const handleDashboardDelta = useCallback((payload: RealtimePayload<DashboardDeltaPayload>) => {
        const data = payload.payload;

        // Only process for current workspace
        if (data.workspace_id !== workspaceId) return;

        // Optimistic update to TanStack Query cache
        queryClient.setQueryData(
            ['dashboard-stats', workspaceId],
            (old: { folders_count: number; documents_count: number; total_items_count: number } | undefined) => {
                if (!old) return old;

                return {
                    ...old,
                    folders_count: Math.max(0, old.folders_count + data.delta_folders),
                    documents_count: Math.max(0, old.documents_count + data.delta_documents),
                    total_items_count: Math.max(0, old.total_items_count + data.delta_total)
                };
            }
        );

        onDashboardDelta?.(data);

        setState(prev => ({ ...prev, messageCount: prev.messageCount + 1 }));
    }, [workspaceId, queryClient, onDashboardDelta]);

    // Handle stats updated (invalidate cache)
    const handleStatsUpdated = useCallback((payload: RealtimePayload<StatsUpdatedPayload>) => {
        const data = payload.payload;

        if (data.workspace_id !== workspaceId) return;

        // Invalidate to trigger refetch with fresh data
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats', workspaceId] });

        onStatsUpdated?.(data);
    }, [workspaceId, queryClient, onStatsUpdated]);

    // Handle entity changed
    const handleEntityChanged = useCallback((payload: RealtimePayload<EntityChangedPayload>) => {
        const data = payload.payload;

        if (data.workspace_id !== workspaceId) return;

        // Invalidate relevant queries based on table
        switch (data.table) {
            case 'entities':
                queryClient.invalidateQueries({ queryKey: ['entities', workspaceId] });
                queryClient.invalidateQueries({ queryKey: ['entity', data.entity_id] });
                break;
            case 'items':
                queryClient.invalidateQueries({ queryKey: ['items', workspaceId] });
                break;
            case 'documents':
                queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
                break;
        }

        onEntityChanged?.(data);

        setState(prev => ({ ...prev, messageCount: prev.messageCount + 1 }));
    }, [workspaceId, queryClient, onEntityChanged]);

    // Handle graph changed
    const handleGraphChanged = useCallback((payload: RealtimePayload<GraphChangedPayload>) => {
        const data = payload.payload;

        if (data.workspace_id !== workspaceId) return;

        // Invalidate graph queries
        queryClient.invalidateQueries({ queryKey: ['graph', workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['graph-neighborhood', data.source_id] });
        queryClient.invalidateQueries({ queryKey: ['graph-neighborhood', data.target_id] });

        onGraphChanged?.(data);

        setState(prev => ({ ...prev, messageCount: prev.messageCount + 1 }));
    }, [workspaceId, queryClient, onGraphChanged]);

    // Handle heartbeat
    const handleHeartbeat = useCallback((payload: RealtimePayload<{ timestamp: number }>) => {
        setState(prev => ({
            ...prev,
            lastHeartbeat: payload.payload.timestamp
        }));
    }, []);

    // Set up subscription
    useEffect(() => {
        const channel = supabase.channel('realtime-bridge')
            .on('broadcast', {}, (payload: any) => {
                switch (payload.event) {
                    case 'dashboard_delta':
                        handleDashboardDelta(payload as RealtimePayload<DashboardDeltaPayload>);
                        break;
                    case 'stats_updated':
                        handleStatsUpdated(payload as RealtimePayload<StatsUpdatedPayload>);
                        break;
                    case 'entity_changed':
                        handleEntityChanged(payload as RealtimePayload<EntityChangedPayload>);
                        break;
                    case 'graph_changed':
                        handleGraphChanged(payload as RealtimePayload<GraphChangedPayload>);
                        break;
                    case 'heartbeat':
                        handleHeartbeat(payload as RealtimePayload<{ timestamp: number }>);
                        break;
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setState(prev => ({ ...prev, isConnected: true }));
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setState(prev => ({ ...prev, isConnected: false }));
                    if (err) onError?.(new Error(String(err)));
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [
        supabase,
        handleDashboardDelta,
        handleStatsUpdated,
        handleEntityChanged,
        handleGraphChanged,
        handleHeartbeat,
        onError
    ]);

    return state;
}

/**
 * Hook specifically for dashboard stats with real-time updates
 */
export function useDashboardStatsRealtime(workspaceId: string) {
    const queryClient = useQueryClient();
    const [optimisticDelta, setOptimisticDelta] = useState({
        folders: 0,
        documents: 0,
        total: 0
    });

    const { isConnected, lastHeartbeat, messageCount } = useRealtimeSync({
        workspaceId,
        onDashboardDelta: (delta) => {
            // Track optimistic deltas for UI feedback
            setOptimisticDelta(prev => ({
                folders: prev.folders + delta.delta_folders,
                documents: prev.documents + delta.delta_documents,
                total: prev.total + delta.delta_total
            }));

            // Reset after animation
            setTimeout(() => {
                setOptimisticDelta({ folders: 0, documents: 0, total: 0 });
            }, 1000);
        },
        onStatsUpdated: () => {
            // Reset optimistic state when server confirms
            setOptimisticDelta({ folders: 0, documents: 0, total: 0 });
        }
    });

    return {
        isConnected,
        lastHeartbeat,
        messageCount,
        optimisticDelta,
        isStale: lastHeartbeat ? Date.now() - lastHeartbeat > 60000 : true
    };
}

/**
 * Hook for Neural Graph with real-time edge updates
 */
export function useGraphRealtime(workspaceId: string) {
    const [pendingEdges, setPendingEdges] = useState<GraphChangedPayload[]>([]);

    const { isConnected } = useRealtimeSync({
        workspaceId,
        onGraphChanged: (change) => {
            setPendingEdges(prev => [...prev, change]);

            // Clear after animation
            setTimeout(() => {
                setPendingEdges(prev => prev.filter(e => e !== change));
            }, 2000);
        }
    });

    return {
        isConnected,
        pendingEdges,
        hasPendingChanges: pendingEdges.length > 0
    };
}