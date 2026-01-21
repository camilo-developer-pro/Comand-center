/**
 * LazyHydrationBoundary - Usage Examples
 * 
 * V1.1 Phase 4: Lazy Hydration
 * 
 * This file demonstrates how to use the LazyHydrationBoundary component
 * to defer widget rendering until they scroll into the viewport.
 */

import React from 'react';
import { LazyHydrationBoundary } from './LazyHydrationBoundary';
import { WidgetSkeleton } from './WidgetSkeleton';

// ============================================================================
// Example 1: Basic Usage with Auto Skeleton Selection
// ============================================================================
export function BasicLazyWidget() {
    return (
        <LazyHydrationBoundary widgetType="crm-leads" minHeight={300}>
            <LeadListWidget />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Example 2: Custom Skeleton
// ============================================================================
export function CustomSkeletonWidget() {
    return (
        <LazyHydrationBoundary
            widgetType="finance-revenue"
            skeleton={<CustomLoadingSkeleton />}
            minHeight={400}
        >
            <RevenueChartWidget />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Example 3: With Visibility Callback (Analytics Tracking)
// ============================================================================
export function TrackedWidget() {
    const handleVisible = () => {
        console.log('Widget became visible - tracking analytics');
        // Track widget impression
        // analytics.track('widget_viewed', { type: 'crm-leads' });
    };

    return (
        <LazyHydrationBoundary
            widgetType="crm-leads"
            onVisible={handleVisible}
            minHeight={300}
        >
            <LeadListWidget />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Example 4: Aggressive Prefetch (Load Before Visible)
// ============================================================================
export function PrefetchWidget() {
    return (
        <LazyHydrationBoundary
            widgetType="finance-expenses"
            rootMargin="300px" // Start loading 300px before entering viewport
            minHeight={350}
        >
            <ExpenseTrackerWidget />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Example 5: Conditional Lazy Loading
// ============================================================================
export function ConditionalLazyWidget({ isEditor }: { isEditor: boolean }) {
    return (
        <LazyHydrationBoundary
            widgetType="crm-leads"
            disabled={isEditor} // Disable lazy loading in editor mode
            minHeight={300}
        >
            <LeadListWidget />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Example 6: Multiple Widgets in Document
// ============================================================================
export function DocumentWithMultipleWidgets() {
    return (
        <div className="document-content">
            <h1>Sales Report</h1>
            <p>Here's an overview of our sales pipeline...</p>

            {/* Widget 1 - Loads immediately if visible */}
            <LazyHydrationBoundary widgetType="crm-leads" minHeight={300}>
                <LeadListWidget />
            </LazyHydrationBoundary>

            <p>Revenue analysis for Q4...</p>

            {/* Widget 2 - Loads only when scrolled into view */}
            <LazyHydrationBoundary widgetType="finance-revenue" minHeight={400}>
                <RevenueChartWidget />
            </LazyHydrationBoundary>

            <p>Expense breakdown...</p>

            {/* Widget 3 - Loads only when scrolled into view */}
            <LazyHydrationBoundary widgetType="finance-expenses" minHeight={350}>
                <ExpenseTrackerWidget />
            </LazyHydrationBoundary>
        </div>
    );
}

// ============================================================================
// Example 7: With Custom Styling
// ============================================================================
export function StyledLazyWidget() {
    return (
        <LazyHydrationBoundary
            widgetType="crm-leads"
            className="my-custom-widget-wrapper"
            minHeight={300}
        >
            <LeadListWidget />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Example 8: Integration with BlockNote Block
// ============================================================================
export function BlockNoteWidgetBlock({ blockId, widgetType, config }: any) {
    return (
        <LazyHydrationBoundary
            widgetType={widgetType}
            minHeight={300}
            rootMargin="100px"
            onVisible={() => {
                console.log(`Widget ${blockId} hydrated`);
            }}
        >
            <WidgetRenderer
                blockId={blockId}
                type={widgetType}
                config={config}
            />
        </LazyHydrationBoundary>
    );
}

// ============================================================================
// Mock Components (for demonstration purposes)
// ============================================================================
function LeadListWidget() {
    return <div>Lead List Widget Content</div>;
}

function RevenueChartWidget() {
    return <div>Revenue Chart Widget Content</div>;
}

function ExpenseTrackerWidget() {
    return <div>Expense Tracker Widget Content</div>;
}

function CustomLoadingSkeleton() {
    return <div className="custom-skeleton">Custom Loading...</div>;
}

function WidgetRenderer({ blockId, type, config }: any) {
    return <div>Widget: {type}</div>;
}
