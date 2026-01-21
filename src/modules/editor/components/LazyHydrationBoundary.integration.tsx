/**
 * LazyHydrationBoundary - BlockNote Integration Guide
 * 
 * V1.1 Phase 4: Lazy Hydration
 * 
 * This file demonstrates how to integrate LazyHydrationBoundary
 * with BlockNote custom blocks for optimal performance.
 */

import React from 'react';
import { LazyHydrationBoundary } from './LazyHydrationBoundary';
import { getWidget } from '../registry';
import type { WidgetKey } from '../registry/types';

// ============================================================================
// Integration Pattern 1: Wrap Widget in Block Render Function
// ============================================================================

/**
 * Example: LeadListBlock with Lazy Hydration
 * 
 * This is how you would modify your existing BlockNote block
 * to use lazy hydration.
 */
export const LeadListBlockWithLazyHydration = {
    render: (props: any) => {
        const WidgetComponent = getWidget('crm-leads');

        return (
            <LazyHydrationBoundary
                widgetType="crm-leads"
                minHeight={300}
                rootMargin="100px"
                onVisible={() => {
                    console.log(`Lead List Block ${props.block.id} hydrated`);
                }}
            >
                <WidgetComponent
                    blockId={props.block.id}
                    config={props.block.props}
                    readOnly={props.editor.isEditable === false}
                />
            </LazyHydrationBoundary>
        );
    },
};

// ============================================================================
// Integration Pattern 2: Generic Widget Wrapper Component
// ============================================================================

/**
 * Generic wrapper that can be used for any widget type.
 * This is the recommended approach for consistency.
 */
interface LazyWidgetBlockProps {
    blockId: string;
    widgetType: WidgetKey;
    config?: Record<string, unknown>;
    readOnly?: boolean;
    minHeight?: number;
}

export function LazyWidgetBlock({
    blockId,
    widgetType,
    config,
    readOnly = false,
    minHeight = 300,
}: LazyWidgetBlockProps) {
    const WidgetComponent = getWidget(widgetType);

    return (
        <LazyHydrationBoundary
            widgetType={widgetType}
            minHeight={minHeight}
            rootMargin="100px"
            onVisible={() => {
                console.log(`Widget ${widgetType} (${blockId}) hydrated`);
            }}
        >
            <WidgetComponent
                blockId={blockId}
                config={config}
                readOnly={readOnly}
            />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Integration Pattern 3: Performance Monitoring
// ============================================================================

/**
 * Enhanced version with performance tracking.
 * Useful for measuring the impact of lazy hydration.
 */
export function LazyWidgetBlockWithMetrics({
    blockId,
    widgetType,
    config,
    readOnly = false,
    minHeight = 300,
}: LazyWidgetBlockProps) {
    const WidgetComponent = getWidget(widgetType);
    const [hydrationTime, setHydrationTime] = React.useState<number | null>(null);

    const handleVisible = () => {
        const startTime = performance.now();

        // Track when widget becomes visible
        console.log(`[Lazy Hydration] Widget ${widgetType} (${blockId}) started hydrating`);

        // Measure hydration time
        requestAnimationFrame(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            setHydrationTime(duration);

            console.log(`[Lazy Hydration] Widget ${widgetType} (${blockId}) hydrated in ${duration.toFixed(2)}ms`);

            // Send to analytics
            // analytics.track('widget_hydrated', {
            //   widgetType,
            //   blockId,
            //   hydrationTime: duration,
            // });
        });
    };

    return (
        <div data-hydration-time={hydrationTime}>
            <LazyHydrationBoundary
                widgetType={widgetType}
                minHeight={minHeight}
                rootMargin="100px"
                onVisible={handleVisible}
            >
                <WidgetComponent
                    blockId={blockId}
                    config={config}
                    readOnly={readOnly}
                />
            </LazyHydrationBoundary>
        </div>
    );
}

// ============================================================================
// Integration Pattern 4: Conditional Lazy Loading Based on Document Size
// ============================================================================

/**
 * Only enable lazy loading for documents with many widgets.
 * Small documents can render all widgets immediately.
 */
interface SmartLazyWidgetBlockProps extends LazyWidgetBlockProps {
    totalWidgetsInDocument: number;
    widgetIndex: number;
}

export function SmartLazyWidgetBlock({
    blockId,
    widgetType,
    config,
    readOnly = false,
    minHeight = 300,
    totalWidgetsInDocument,
    widgetIndex,
}: SmartLazyWidgetBlockProps) {
    const WidgetComponent = getWidget(widgetType);

    // Only enable lazy loading if:
    // 1. Document has 5+ widgets, OR
    // 2. This widget is not in the first 3 positions
    const shouldLazyLoad = totalWidgetsInDocument >= 5 || widgetIndex >= 3;

    return (
        <LazyHydrationBoundary
            widgetType={widgetType}
            minHeight={minHeight}
            rootMargin="100px"
            disabled={!shouldLazyLoad}
        >
            <WidgetComponent
                blockId={blockId}
                config={config}
                readOnly={readOnly}
            />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Usage in BlockNote Schema
// ============================================================================

/**
 * Example of how to update your BlockNote schema to use lazy hydration.
 * 
 * Before:
 * ```tsx
 * const LeadListBlock = createReactBlockSpec({
 *   type: 'leadList',
 *   render: (props) => {
 *     const Widget = getWidget('crm-leads');
 *     return <Widget blockId={props.block.id} config={props.block.props} />;
 *   }
 * });
 * ```
 * 
 * After:
 * ```tsx
 * const LeadListBlock = createReactBlockSpec({
 *   type: 'leadList',
 *   render: (props) => (
 *     <LazyWidgetBlock
 *       blockId={props.block.id}
 *       widgetType="crm-leads"
 *       config={props.block.props}
 *       readOnly={!props.editor.isEditable}
 *     />
 *   )
 * });
 * ```
 */

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Utility to measure the performance impact of lazy hydration.
 */
export function measureLazyHydrationImpact() {
    const metrics = {
        totalWidgets: 0,
        hydratedWidgets: 0,
        averageHydrationTime: 0,
        savedRequests: 0,
    };

    // Listen for hydration events
    window.addEventListener('widget-hydrated', ((event: CustomEvent) => {
        metrics.hydratedWidgets++;
        metrics.averageHydrationTime =
            (metrics.averageHydrationTime * (metrics.hydratedWidgets - 1) + event.detail.duration) /
            metrics.hydratedWidgets;
    }) as EventListener);

    return metrics;
}
