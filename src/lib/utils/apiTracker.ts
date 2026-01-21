/**
 * API Response Time Tracker
 * 
 * Utility to wrap server actions and track response times.
 */

import { logApiResponse } from '@/modules/core/admin/actions/healthMonitorActions';

type AsyncFunction<T> = () => Promise<T>;

interface TrackOptions {
    endpoint: string;
    method?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Wraps an async function and tracks its execution time
 */
export async function trackApiCall<T>(
    fn: AsyncFunction<T>,
    options: TrackOptions
): Promise<T> {
    const startTime = performance.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
        const result = await fn();
        return result;
    } catch (error) {
        statusCode = 500;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
    } finally {
        const responseTime = Math.round(performance.now() - startTime);

        // Log asynchronously - don't await
        logApiResponse(
            options.endpoint,
            options.method || 'POST',
            statusCode,
            responseTime,
            errorMessage,
            options.metadata
        ).catch(console.error);
    }
}

/**
 * Decorator-style function for tracking server actions
 */
export function withTracking<TArgs extends unknown[], TResult>(
    endpoint: string,
    fn: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
        return trackApiCall(
            () => fn(...args),
            { endpoint, method: 'SERVER_ACTION' }
        );
    };
}
