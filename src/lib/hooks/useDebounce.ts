'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook that debounces a callback function.
 * Used for auto-saving document content without flooding the server.
 * 
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 1000ms)
 * @returns Debounced function and cancel method
 */
export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 1000
): { debouncedFn: (...args: Parameters<T>) => void; cancel: () => void } {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);

    // Update callback ref on each render to capture latest closure
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const debouncedFn = useCallback(
        (...args: Parameters<T>) => {
            cancel();
            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        },
        [delay, cancel]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => cancel();
    }, [cancel]);

    return { debouncedFn, cancel };
}
