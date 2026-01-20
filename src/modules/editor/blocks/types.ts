/**
 * Widget Block Types
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * Type definitions for custom widget blocks in BlockNote.
 */

import { WidgetKey } from '../registry';

// ============================================================
// Block Attribute Types
// ============================================================

/**
 * Props stored in the BlockNote document JSON.
 * These are persisted and used to configure the widget on load.
 */
export interface WidgetBlockProps {
    /** The widget type from the registry */
    widgetType: WidgetKey;

    /** Widget-specific configuration (serialized JSON string for BlockNote compatibility) */
    config: string | Record<string, unknown>;

    /** Optional title override */
    title?: string;

    /** Unique ID for this widget instance */
    widgetId: string;
}

/**
 * Default props for a new widget block.
 */
export const DEFAULT_WIDGET_PROPS: WidgetBlockProps = {
    widgetType: 'placeholder',
    config: {},
    title: undefined,
    widgetId: '',
};

// ============================================================
// Widget Configuration Types (per widget type)
// ============================================================

/**
 * Configuration for CRM Leads widget
 */
export interface CRMLeadsConfig {
    title?: string;
    showValue?: boolean;
    showCompany?: boolean;
    filterStatus?: string[];
    maxItems?: number;
}

/**
 * Configuration for Finance Revenue widget
 */
export interface FinanceRevenueConfig {
    title?: string;
    period?: 'week' | 'month' | 'quarter' | 'year';
    chartType?: 'line' | 'bar' | 'area';
}

/**
 * Union of all widget configurations
 */
export type WidgetConfigByType = {
    'crm-leads': CRMLeadsConfig;
    'crm-lead-kanban': CRMLeadsConfig;
    'finance-revenue': FinanceRevenueConfig;
    'finance-expenses': Record<string, unknown>;
    'placeholder': Record<string, unknown>;
};

// ============================================================
// Block State Types
// ============================================================

/**
 * Runtime state for a widget block (not persisted)
 */
export interface WidgetBlockState {
    isSelected: boolean;
    isConfigOpen: boolean;
    isLoading: boolean;
    error: string | null;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate a unique widget ID
 */
export function generateWidgetId(): string {
    return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get default config for a widget type
 */
export function getDefaultConfig(widgetType: WidgetKey): Record<string, unknown> {
    const defaults: Record<WidgetKey, Record<string, unknown>> = {
        'crm-leads': {
            showValue: true,
            showCompany: true,
            maxItems: 10,
        },
        'crm-lead-kanban': {
            showValue: true,
            maxItems: 20,
        },
        'finance-revenue': {
            period: 'month',
            chartType: 'line',
        },
        'finance-expenses': {},
        'placeholder': {},
    };

    return defaults[widgetType] || {};
}

/**
 * Validate widget props
 */
export function validateWidgetProps(props: Partial<WidgetBlockProps>): boolean {
    if (!props.widgetType) return false;
    if (!props.widgetId) return false;
    return true;
}
