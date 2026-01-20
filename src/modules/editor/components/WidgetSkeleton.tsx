'use client';

interface WidgetSkeletonProps {
    title?: string;
}

/**
 * Loading skeleton displayed while widgets are being lazy-loaded.
 * Provides visual feedback and prevents layout shift.
 */
export function WidgetSkeleton({ title = 'Loading widget...' }: WidgetSkeletonProps) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 my-2">
            <div className="animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-4 bg-gray-300 rounded" />
                    <div className="h-4 w-32 bg-gray-300 rounded" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                    <div className="h-3 bg-gray-200 rounded w-4/6" />
                </div>
                <p className="text-xs text-gray-400 mt-3">{title}</p>
            </div>
        </div>
    );
}
