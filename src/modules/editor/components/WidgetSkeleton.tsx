'use client';

/**
 * Widget Loading Skeleton
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Skeleton loaders for widgets during data fetching.
 * Reduces Cumulative Layout Shift (CLS).
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface WidgetSkeletonProps {
    title?: string;
    rows?: number;
    showHeader?: boolean;
    className?: string;
}

export function WidgetSkeleton({
    title,
    rows = 5,
    showHeader = true,
    className,
}: WidgetSkeletonProps) {
    return (
        <div
            className={cn(
                'w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse',
                className
            )}
        >
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {title ? (
                            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                                {title}
                            </span>
                        ) : (
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        )}
                    </div>
                    <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            )}

            {/* Table Header */}
            <div className="flex gap-4 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-1/6 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-1/6 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>

            {/* Table Rows */}
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />

                        {/* Name & Email */}
                        <div className="flex-1 space-y-1">
                            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-2 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                        </div>

                        {/* Status Badge */}
                        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />

                        {/* Value */}
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Specific Widget Skeletons
// ============================================================

export function LeadListSkeleton() {
    return <WidgetSkeleton title="Loading leads..." rows={5} />;
}

export function ChartSkeleton() {
    return (
        <div className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex gap-2">
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-48 bg-gray-100 dark:bg-gray-900 rounded flex items-end justify-around p-4">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-8 bg-gray-200 dark:bg-gray-700 rounded-t"
                        style={{ height: `${Math.random() * 60 + 20}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse"
                >
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            ))}
        </div>
    );
}
