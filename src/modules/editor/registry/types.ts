/**
 * Widget Registry Types & Metadata
 * 
 * V1.1 Phase 3: Metadata Separation
 * 
 * Decouples widget definitions from the dynamic registry to avoid circular dependencies.
 */

import { ComponentType } from 'react';

// ============================================================
// Widget Type Definition
// ============================================================

/**
 * All available widget types.
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
