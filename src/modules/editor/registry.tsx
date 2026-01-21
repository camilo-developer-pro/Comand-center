/**
 * Widget Registry
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Central registry for all widget components.
 * Uses dynamic imports for code splitting - widgets only load when needed.
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { WidgetSkeleton, LeadListSkeleton, ChartSkeleton } from './components/WidgetSkeleton';
import {
    type WidgetKey,
    type WidgetProps,
    type WidgetMetadata,
    WIDGET_METADATA,
    getAvailableWidgets,
    getAllWidgets
} from './registry/types';

// Re-export for convenience
export * from './registry/types';

// ============================================================
// Widget Registry
// ============================================================

/**
 * The main widget registry.
 * 
 * Each widget is loaded dynamically with:
 * - ssr: false - Widgets are client-only (they use browser APIs and fetch data)
 * - loading - Skeleton shown while loading the widget code
 */
export const WIDGET_REGISTRY: Record<WidgetKey, ComponentType<WidgetProps>> = {
    // ============================================================
    // CRM Module Widgets
    // ============================================================

    'crm-leads': dynamic(
        () => import('@/modules/crm/components/LeadListWidget').then(mod => mod.LeadListWidget),
        {
            loading: () => <LeadListSkeleton />,
            ssr: false,
        }
    ),

    'crm-lead-kanban': dynamic(
        () => import('@/modules/crm/components/LeadListWidget').then(mod => mod.LeadListWidget),
        {
            // Kanban view - future implementation, using list for now
            loading: () => <LeadListSkeleton />,
            ssr: false,
        }
    ),

    // ============================================================
    // Finance Module Widgets (Stubs for future)
    // ============================================================

    'finance-revenue': dynamic(
        () => import('./components/PlaceholderWidget').then(mod => ({
            default: () => <mod.PlaceholderWidget type="finance-revenue" title="Revenue Chart" />
        })),
        {
            loading: () => <ChartSkeleton />,
            ssr: false,
        }
    ),

    'finance-expenses': dynamic(
        () => import('./components/PlaceholderWidget').then(mod => ({
            default: () => <mod.PlaceholderWidget type="finance-expenses" title="Expense Tracker" />
        })),
        {
            loading: () => <ChartSkeleton />,
            ssr: false,
        }
    ),

    // ============================================================
    // Fallback Widget
    // ============================================================

    'placeholder': dynamic(
        () => import('./components/PlaceholderWidget'),
        {
            loading: () => <WidgetSkeleton title="Loading widget..." rows={3} />,
            ssr: false,
        }
    ),
};

// ============================================================
// Widget Resolution Helper
// ============================================================

/**
 * Get a widget component by type.
 * Returns the placeholder widget if type is not found.
 */
export function getWidget(type: string): ComponentType<WidgetProps> {
    if (type in WIDGET_REGISTRY) {
        return WIDGET_REGISTRY[type as WidgetKey];
    }

    console.warn(`[WidgetRegistry] Unknown widget type: ${type}, using placeholder`);
    return WIDGET_REGISTRY['placeholder'];
}

/**
 * Check if a widget type is registered.
 */
export function isValidWidgetType(type: string): type is WidgetKey {
    return type in WIDGET_REGISTRY;
}

/**
 * Get all available widget types.
 */
export function getAvailableWidgetTypes(): WidgetKey[] {
    return Object.keys(WIDGET_REGISTRY) as WidgetKey[];
}
