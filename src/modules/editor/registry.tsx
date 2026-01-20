import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { WidgetSkeleton } from './components/WidgetSkeleton';

/**
 * Strict type definition for all valid widget keys.
 * This type MUST match the widget types stored in the database.
 * Adding a new widget requires:
 * 1. Adding the key to this union type
 * 2. Adding the dynamic import to WIDGET_REGISTRY
 */
export type WidgetKey =
    | 'crm-leads'
    | 'revenue-chart'
    | 'placeholder';

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

/**
 * Type for the widget component with base props.
 */
export type WidgetComponent = ComponentType<BaseWidgetProps>;

/**
 * The Dynamic Widget Registry.
 * 
 * Each widget is lazy-loaded using next/dynamic with SSR disabled.
 * This ensures:
 * 1. Widgets only load when needed (code splitting)
 * 2. No server-side rendering attempts (widgets use browser APIs)
 * 3. Clean loading states via WidgetSkeleton
 * 
 * To add a new widget:
 * 1. Create the component in its module (e.g., src/modules/crm/components/)
 * 2. Add the WidgetKey type above
 * 3. Add the dynamic import below
 */
export const WIDGET_REGISTRY: Record<WidgetKey, WidgetComponent> = {
    'crm-leads': dynamic(
        () => import('@/modules/crm/components/LeadListWidget').then(mod => mod.LeadListWidget),
        {
            loading: () => <WidgetSkeleton title="Loading CRM Leads..." />,
      ssr: false,
        }
    ) as WidgetComponent,

    'revenue-chart': dynamic(
        () => import('@/modules/finance/components/RevenueChartWidget').then(mod => mod.RevenueChartWidget),
        {
            loading: () => <WidgetSkeleton title="Loading Revenue Chart..." />,
      ssr: false,
        }
    ) as WidgetComponent,

    'placeholder': dynamic(
        () => import('./components/PlaceholderWidget').then(mod => ({
            default: (props: BaseWidgetProps) => <mod.PlaceholderWidget widgetType={ props.config?.type as string || 'unknown' } />
    })),
    {
        loading: () => <WidgetSkeleton title="Loading..." />,
            ssr: false,
    }
  ) as WidgetComponent,
};

/**
 * Safely retrieves a widget component from the registry.
 * Returns the placeholder widget if the key is not found.
 */
export function getWidget(key: string): WidgetComponent {
    if (key in WIDGET_REGISTRY) {
        return WIDGET_REGISTRY[key as WidgetKey];
    }
    console.warn(`[WidgetRegistry] Unknown widget key: ${key}, using placeholder`);
    return WIDGET_REGISTRY['placeholder'];
}

/**
 * Type guard to check if a string is a valid WidgetKey.
 */
export function isValidWidgetKey(key: string): key is WidgetKey {
    return key in WIDGET_REGISTRY;
}
