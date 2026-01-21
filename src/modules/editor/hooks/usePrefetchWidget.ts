'use client';

/**
 * Widget Prefetch Hook
 * 
 * V1.1 Phase 4: Lazy Hydration - Optional Enhancement
 * 
 * Prefetches widget data on hover to improve perceived performance.
 * Uses TanStack Query's prefetchQuery to populate the cache before
 * the widget hydrates, reducing loading states.
 * 
 * Features:
 * - Debounced hover detection (300ms default)
 * - Widget-specific prefetch logic via registry
 * - Automatic cleanup on unmount
 * - Only prefetches for unhydrated widgets
 */

import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WidgetKey } from '../registry';
import { getLeads } from '@/modules/crm/actions/leadActions';
import { leadKeys } from '@/modules/crm/hooks/useLeads';

// ============================================================================
// Types
// ============================================================================

export interface UsePrefetchWidgetOptions {
    /** Widget type to prefetch */
    widgetType: WidgetKey;

    /** Widget configuration (used for query parameters) */
    config: Record<string, unknown>;

    /** Debounce delay in milliseconds */
    delay?: number;

    /** Enable/disable prefetching */
    enabled?: boolean;
}

export interface UsePrefetchWidgetResult {
    /** Call on mouse enter to start prefetch timer */
    onMouseEnter: () => void;

    /** Call on mouse leave to cancel prefetch timer */
    onMouseLeave: () => void;

    /** Is currently prefetching */
    isPrefetching: boolean;
}

// ============================================================================
// Prefetch Function Registry
// ============================================================================

/**
 * Registry of prefetch functions for each widget type.
 * Each function receives the queryClient and widget config.
 */
const PREFETCH_REGISTRY: Partial<Record<
    WidgetKey,
    (queryClient: any, config: Record<string, unknown>) => Promise<void>
>> = {
    /**
     * Prefetch CRM Leads data
     */
    'crm-leads': async (queryClient, config) => {
        const options = {
            status: config.filterStatus as any,
            limit: (config.maxItems as number) || 10,
        };

        console.log('[Prefetch] Starting CRM leads prefetch', options);

        await queryClient.prefetchQuery({
            queryKey: leadKeys.list(options),
            queryFn: async () => {
                const result = await getLeads(options);

                if (!result.success) {
                    throw new Error(result.error);
                }

                return result;
            },
            staleTime: 30 * 1000, // 30 seconds
        });

        console.log('[Prefetch] CRM leads prefetch complete');
    },

    /**
     * Prefetch CRM Lead Kanban data (same as leads for now)
     */
    'crm-lead-kanban': async (queryClient, config) => {
        // Reuse the same prefetch logic as crm-leads
        await PREFETCH_REGISTRY['crm-leads']?.(queryClient, config);
    },

    /**
     * Placeholder for finance widgets (no-op for now)
     */
    'finance-revenue': async (queryClient, config) => {
        console.log('[Prefetch] Finance revenue prefetch (placeholder)');
        // TODO: Implement when finance module is ready
    },

    'finance-expenses': async (queryClient, config) => {
        console.log('[Prefetch] Finance expenses prefetch (placeholder)');
        // TODO: Implement when finance module is ready
    },
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to prefetch widget data on hover.
 * 
 * @example
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = usePrefetchWidget({
 *   widgetType: 'crm-leads',
 *   config: { maxItems: 10 },
 *   enabled: !isHydrated,
 * });
 * 
 * <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *   <Widget />
 * </div>
 * ```
 */
export function usePrefetchWidget({
    widgetType,
    config,
    delay = 300,
    enabled = true,
}: UsePrefetchWidgetOptions): UsePrefetchWidgetResult {
    const queryClient = useQueryClient();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPrefetchingRef = useRef(false);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const onMouseEnter = useCallback(() => {
        // Skip if disabled
        if (!enabled) {
            return;
        }

        // Get prefetch function for this widget type
        const prefetchFn = PREFETCH_REGISTRY[widgetType];

        if (!prefetchFn) {
            console.log(`[Prefetch] No prefetch function registered for widget type: ${widgetType}`);
            return;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Start debounced prefetch
        timeoutRef.current = setTimeout(async () => {
            try {
                isPrefetchingRef.current = true;
                console.log(`[Prefetch] Hovering over ${widgetType} widget, starting prefetch...`);

                await prefetchFn(queryClient, config);

                console.log(`[Prefetch] Successfully prefetched ${widgetType} widget data`);
            } catch (error) {
                console.error(`[Prefetch] Failed to prefetch ${widgetType} widget:`, error);
            } finally {
                isPrefetchingRef.current = false;
                timeoutRef.current = null;
            }
        }, delay);
    }, [widgetType, config, delay, enabled, queryClient]);

    const onMouseLeave = useCallback(() => {
        // Cancel pending prefetch
        if (timeoutRef.current) {
            console.log(`[Prefetch] Mouse left before prefetch started, cancelling`);
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    return {
        onMouseEnter,
        onMouseLeave,
        isPrefetching: isPrefetchingRef.current,
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Register a custom prefetch function for a widget type.
 * Useful for adding prefetch logic for custom widgets.
 */
export function registerWidgetPrefetch(
    widgetType: WidgetKey,
    prefetchFn: (queryClient: any, config: Record<string, unknown>) => Promise<void>
) {
    PREFETCH_REGISTRY[widgetType] = prefetchFn;
    console.log(`[Prefetch] Registered prefetch function for widget type: ${widgetType}`);
}

/**
 * Check if a widget type has a registered prefetch function.
 */
export function hasWidgetPrefetch(widgetType: WidgetKey): boolean {
    return widgetType in PREFETCH_REGISTRY;
}
