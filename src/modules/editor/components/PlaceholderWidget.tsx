'use client';

/**
 * Placeholder Widget
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Shown for widgets that are not yet implemented or for unknown widget types.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PlaceholderWidgetProps {
    type?: string;
    title?: string;
    className?: string;
}

export function PlaceholderWidget({
    type = 'unknown',
    title = 'Widget',
    className
}: PlaceholderWidgetProps) {
    return (
        <div
            className={cn(
                'w-full p-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg',
                className
            )}
        >
            <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3">
                    <svg
                        className="w-6 h-6 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {title}
                </h3>

                {/* Type Badge */}
                <span className="mt-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded font-mono">
                    {type}
                </span>

                {/* Message */}
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                    This widget is coming soon. Check back later for updates!
                </p>
            </div>
        </div>
    );
}

export default PlaceholderWidget;
