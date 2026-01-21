'use client';

/**
 * Lazy Hydration Boundary
 * 
 * V1.1 Phase 4: Lazy Hydration
 * 
 * Defers widget rendering until they scroll into the viewport.
 * Prevents 50+ simultaneous API requests on document load.
 * 
 * Features:
 * - Intersection Observer-based lazy loading
 * - Automatic skeleton selection by widget type
 * - Layout shift prevention with minimum height
 * - Once hydrated, stays hydrated (no unmounting)
 * - Optional fade-in animation
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useIntersectionObserver } from '@/lib/hooks';
import {
    WidgetSkeleton,
    LeadListSkeleton,
    ChartSkeleton,
    StatsSkeleton
} from './WidgetSkeleton';
import type { WidgetKey } from '../registry';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface LazyHydrationBoundaryProps {
    /** The widget to lazy-load */
    children: React.ReactNode;

    /** Custom skeleton component (optional) */
    skeleton?: React.ReactNode;

    /** Widget type for default skeleton selection */
    widgetType?: WidgetKey;

    /** Minimum height to prevent CLS (Cumulative Layout Shift) */
    minHeight?: number | string;

    /** Root margin for early trigger (default: '100px') */
    rootMargin?: string;

    /** Disable lazy loading (render immediately) */
    disabled?: boolean;

    /** Callback when widget becomes visible */
    onVisible?: () => void;

    /** Additional className for wrapper */
    className?: string;
}

// ============================================================================
// Skeleton Selection Logic
// ============================================================================

/**
 * Select the appropriate skeleton based on widget type.
 */
function getDefaultSkeleton(widgetType?: WidgetKey): React.ReactNode {
    switch (widgetType) {
        case 'crm-leads':
        case 'crm-lead-kanban':
            return <LeadListSkeleton />;

        case 'finance-revenue':
        case 'finance-expenses':
            return <ChartSkeleton />;

        default:
            return <WidgetSkeleton rows={5} />;
    }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Lazy Hydration Boundary Component
 * 
 * Wraps widgets and defers their rendering until they enter the viewport.
 * 
 * @example
 * ```tsx
 * <LazyHydrationBoundary widgetType="crm-leads" minHeight={300}>
 *   <LeadListWidget />
 * </LazyHydrationBoundary>
 * ```
 */
export function LazyHydrationBoundary({
    children,
    skeleton,
    widgetType,
    minHeight,
    rootMargin = '100px',
    disabled = false,
    onVisible,
    className,
}: LazyHydrationBoundaryProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Use intersection observer to detect when widget enters viewport
    const { hasIntersected } = useIntersectionObserver(ref, {
        threshold: 0.1,
        rootMargin,
        triggerOnce: true,
        enabled: !disabled, // Skip observation if disabled
    });

    // Fire onVisible callback once when widget becomes visible
    const hasCalledOnVisible = useRef(false);

    useEffect(() => {
        if (hasIntersected && onVisible && !hasCalledOnVisible.current) {
            hasCalledOnVisible.current = true;
            onVisible();
        }
    }, [hasIntersected, onVisible]);

    // Determine if we should render the widget
    const shouldRenderWidget = disabled || hasIntersected;

    // Select skeleton to display
    const skeletonElement = skeleton ?? getDefaultSkeleton(widgetType);

    // Calculate minimum height style
    const minHeightStyle = minHeight
        ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }
        : undefined;

    return (
        <div
            ref={ref}
            className={cn(
                'lazy-hydration-boundary',
                shouldRenderWidget && 'widget-hydrating',
                className
            )}
            style={minHeightStyle}
            data-hydrated={shouldRenderWidget}
            data-widget-type={widgetType}
        >
            {shouldRenderWidget ? children : skeletonElement}
        </div>
    );
}

// ============================================================================
// Styles (CSS-in-JS alternative using inline styles)
// ============================================================================

/**
 * Optional: Add this to your global CSS for fade-in animation
 * 
 * ```css
 * .widget-hydrating {
 *   animation: fadeIn 0.2s ease-out;
 * }
 * 
 * @keyframes fadeIn {
 *   from { opacity: 0; }
 *   to { opacity: 1; }
 * }
 * ```
 */
