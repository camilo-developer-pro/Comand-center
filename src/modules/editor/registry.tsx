import dynamic from 'next/dynamic'

// Re-export the custom schema for type usage
export { customSchema } from './schema'
export type { CustomSchema } from './schema'

/**
 * Base props that all widgets receive from the Editor.
 */
export interface BaseWidgetProps {
    /** The unique block ID from BlockNote */
    blockId: string;
    /** Widget-specific configuration from block attributes */
    config?: Record<string, unknown>;
    /** Whether the widget is in read-only mode */
    readOnly?: boolean;
}

// Widget registry for dynamic loading
export const WIDGET_REGISTRY = {
    'crm-leads': dynamic(
        () => import('@/modules/crm/components/LeadListWidget'),
        {
            loading: () => (
                <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ),
            ssr: false,
        }
    ),
}

export type WidgetKey = keyof typeof WIDGET_REGISTRY
