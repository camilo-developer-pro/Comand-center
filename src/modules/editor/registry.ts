// Widget Registry - Lazy Loading Implementation
// Widgets will be added here as they are created
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

export type WidgetType = 'crm-leads' // Add more types as needed

type WidgetRegistry = Record<WidgetType, ComponentType<{ config: unknown }>>

export const WIDGET_REGISTRY: Partial<WidgetRegistry> = {
    // 'crm-leads': dynamic(() => import('@/modules/crm/components/LeadListWidget'), {
    //   loading: () => <div className="h-32 bg-muted animate-pulse rounded-md" />,
    //   ssr: false
    // }),
}
