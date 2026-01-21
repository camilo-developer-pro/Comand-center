'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

/**
 * Configuration options for the Intersection Observer hook.
 */
export interface UseIntersectionObserverOptions {
    /**
     * Visibility threshold(s) to trigger intersection callback.
     * - Single number: triggers once at that visibility percentage
     * - Array: triggers at multiple visibility percentages
     * @default 0.1
     */
    threshold?: number | number[];

    /**
     * Margin around the root element to expand/shrink the intersection area.
     * Useful for prefetching content before it enters the viewport.
     * @default '100px'
     */
    rootMargin?: string;

    /**
     * Custom root element for intersection detection.
     * If null, uses the browser viewport.
     * @default null
     */
    root?: Element | null;

    /**
     * If true, observer disconnects after first intersection.
     * Useful for lazy loading that only needs to trigger once.
     * @default true
     */
    triggerOnce?: boolean;

    /**
     * Conditionally enable/disable the observer.
     * @default true
     */
    enabled?: boolean;
}

/**
 * Return value from the Intersection Observer hook.
 */
export interface UseIntersectionObserverResult {
    /**
     * Is the element currently intersecting with the viewport?
     */
    isIntersecting: boolean;

    /**
     * Has the element ever intersected with the viewport?
     * This flag remains true even after the element leaves the viewport.
     * Useful for lazy loading that should only trigger once.
     */
    hasIntersected: boolean;

    /**
     * Current visibility ratio of the element (0-1).
     * 0 = completely hidden, 1 = completely visible
     */
    intersectionRatio: number;
}

/**
 * Custom hook that observes when an element enters/exits the viewport.
 * Used for lazy hydration of widgets to improve initial load performance.
 * 
 * @param ref - React ref to the target DOM element
 * @param options - Configuration options for the observer
 * @returns Object with intersection state
 * 
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const { isIntersecting, hasIntersected } = useIntersectionObserver(ref, {
 *   threshold: 0.1,
 *   rootMargin: '100px',
 *   triggerOnce: true
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {hasIntersected ? <ExpensiveWidget /> : <WidgetSkeleton />}
 *   </div>
 * );
 * ```
 */
export function useIntersectionObserver<T extends Element = Element>(
    ref: RefObject<T | null>,
    options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
    const {
        threshold = 0.1,
        rootMargin = '100px',
        root = null,
        triggerOnce = true,
        enabled = true,
    } = options;

    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const [intersectionRatio, setIntersectionRatio] = useState(0);

    // Store observer instance to clean up properly
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        // Skip if disabled or element not mounted
        if (!enabled || !ref.current) {
            return;
        }

        // Graceful fallback for browsers without IntersectionObserver support
        if (typeof window === 'undefined' || !window.IntersectionObserver) {
            setIsIntersecting(true);
            setHasIntersected(true);
            setIntersectionRatio(1);
            return;
        }

        const element = ref.current;

        // Create observer instance
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const isCurrentlyIntersecting = entry.isIntersecting;
                    const currentRatio = entry.intersectionRatio;

                    setIsIntersecting(isCurrentlyIntersecting);
                    setIntersectionRatio(currentRatio);

                    // Set hasIntersected flag (sticky - never resets to false)
                    if (isCurrentlyIntersecting && !hasIntersected) {
                        setHasIntersected(true);

                        // Disconnect observer if triggerOnce is enabled
                        if (triggerOnce && observerRef.current) {
                            observerRef.current.disconnect();
                            observerRef.current = null;
                        }
                    }
                });
            },
            {
                threshold,
                rootMargin,
                root,
            }
        );

        // Start observing
        observerRef.current.observe(element);

        // Cleanup function
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [ref, threshold, rootMargin, root, triggerOnce, enabled, hasIntersected]);

    return {
        isIntersecting,
        hasIntersected,
        intersectionRatio,
    };
}
