/**
 * useIntersectionObserver Hook - Usage Examples
 * 
 * This file demonstrates how to use the useIntersectionObserver hook
 * for lazy widget hydration in the Command Center ERP.
 */

import { useRef } from 'react';
import { useIntersectionObserver } from '@/lib/hooks';

// ============================================================================
// Example 1: Basic Lazy Loading (Default Configuration)
// ============================================================================
export function BasicLazyWidget() {
    const ref = useRef<HTMLDivElement>(null);
    const { hasIntersected } = useIntersectionObserver(ref);

    return (
        <div ref={ref} className="widget-container">
            {hasIntersected ? (
                <ExpensiveWidget />
            ) : (
                <WidgetSkeleton />
            )}
        </div>
    );
}

// ============================================================================
// Example 2: Progressive Loading with Multiple Thresholds
// ============================================================================
export function ProgressiveLoadWidget() {
    const ref = useRef<HTMLDivElement>(null);
    const { intersectionRatio, hasIntersected } = useIntersectionObserver(ref, {
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '50px',
    });

    return (
        <div ref={ref} className="widget-container">
            {hasIntersected ? (
                <div>
                    <ExpensiveWidget />
                    <div className="opacity-indicator" style={{ opacity: intersectionRatio }}>
                        Visibility: {Math.round(intersectionRatio * 100)}%
                    </div>
                </div>
            ) : (
                <WidgetSkeleton />
            )}
        </div>
    );
}

// ============================================================================
// Example 3: Continuous Monitoring (No Trigger Once)
// ============================================================================
export function AnimatedWidget() {
    const ref = useRef<HTMLDivElement>(null);
    const { isIntersecting } = useIntersectionObserver(ref, {
        triggerOnce: false, // Keep observing
        threshold: 0.5,
        rootMargin: '0px',
    });

    return (
        <div
            ref={ref}
            className={`widget-container ${isIntersecting ? 'animate-in' : 'animate-out'}`}
        >
            <Widget />
        </div>
    );
}

// ============================================================================
// Example 4: Conditional Observation
// ============================================================================
export function ConditionalWidget({ shouldObserve }: { shouldObserve: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const { hasIntersected } = useIntersectionObserver(ref, {
        enabled: shouldObserve, // Only observe when enabled
    });

    return (
        <div ref={ref}>
            {hasIntersected ? <Widget /> : <Placeholder />}
        </div>
    );
}

// ============================================================================
// Example 5: Prefetch Before Viewport (Aggressive Lazy Loading)
// ============================================================================
export function PrefetchWidget() {
    const ref = useRef<HTMLDivElement>(null);
    const { hasIntersected } = useIntersectionObserver(ref, {
        threshold: 0.01, // Trigger very early
        rootMargin: '200px', // Start loading 200px before entering viewport
        triggerOnce: true,
    });

    return (
        <div ref={ref}>
            {hasIntersected ? <DataHeavyWidget /> : <WidgetSkeleton />}
        </div>
    );
}

// ============================================================================
// Example 6: Scrollable Container (Custom Root)
// ============================================================================
export function ScrollContainerWidget() {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<HTMLDivElement>(null);

    const { hasIntersected } = useIntersectionObserver(widgetRef, {
        root: containerRef.current, // Observe within custom container
        threshold: 0.1,
    });

    return (
        <div ref={containerRef} className="scrollable-container">
            <div ref={widgetRef}>
                {hasIntersected ? <Widget /> : <WidgetSkeleton />}
            </div>
        </div>
    );
}

// ============================================================================
// Mock Components (for demonstration purposes)
// ============================================================================
function ExpensiveWidget() {
    return <div>Expensive Widget Loaded!</div>;
}

function Widget() {
    return <div>Widget Content</div>;
}

function DataHeavyWidget() {
    return <div>Data Heavy Widget</div>;
}

function WidgetSkeleton() {
    return <div className="skeleton">Loading...</div>;
}

function Placeholder() {
    return <div>Placeholder</div>;
}
