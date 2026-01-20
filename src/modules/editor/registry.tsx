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

// Re-export the custom schema for type usage
export { customSchema } from './schema';
export type { CustomSchema } from './schema';

// ============================================================
// Widget Type Definition
// ============================================================

/**
 * All available widget types.
 * Add new widget types here when creating new modules.
 */
export type WidgetKey =
    | 'crm-leads'
    | 'crm-lead-kanban'
    | 'finance-revenue'
    | 'finance-expenses'
    | 'placeholder';

// ============================================================
// Widget Configuration Type
// ============================================================

export interface WidgetConfig {
    [key: string]: unknown;
}

/**
 * Base props that all widgets receive from the Editor.
 */
export interface BaseWidgetProps {
    /** The unique block ID from BlockNote */
    blockId?: string;
    /** Widget-specific configuration from block attributes */
    config?: WidgetConfig;
    /** Whether the widget is in read-only mode */
    readOnly?: boolean;
}

export interface WidgetProps extends BaseWidgetProps {
    className?: string;
}

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

// ============================================================
// Widget Metadata (for UI pickers)
// ============================================================

export interface WidgetMetadata {
    key: WidgetKey;
    label: string;
    description: string;
    icon: string; // Emoji or icon name
    module: string;
    isAvailable: boolean;
}

export const WIDGET_METADATA: WidgetMetadata[] = [
    {
        key: 'crm-leads',
        label: 'CRM Lead List',
        description: 'Display and manage your CRM leads',
        icon: '👥',
        module: 'crm',
        isAvailable: true,
    },
    {
        key: 'crm-lead-kanban',
        label: 'Lead Kanban Board',
        description: 'Visualize leads in a kanban pipeline',
        icon: '📋',
        module: 'crm',
        isAvailable: false, // Coming soon
    },
    {
        key: 'finance-revenue',
        label: 'Revenue Chart',
        description: 'Track your revenue over time',
        icon: '📈',
        module: 'finance',
        isAvailable: false, // Coming soon
    },
    {
        key: 'finance-expenses',
        label: 'Expense Tracker',
        description: 'Monitor and categorize expenses',
        icon: '💰',
        module: 'finance',
        isAvailable: false, // Coming soon
    },
];

/**
 * Get available widgets for the widget picker.
 */
export function getAvailableWidgets(): WidgetMetadata[] {
    return WIDGET_METADATA.filter(w => w.isAvailable);
}

/**
 * Get all widgets including coming soon.
 */
export function getAllWidgets(): WidgetMetadata[] {
    return WIDGET_METADATA;
}
