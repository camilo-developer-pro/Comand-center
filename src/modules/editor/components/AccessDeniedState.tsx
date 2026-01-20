'use client';

/**
 * Access Denied State
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Shown when RLS denies access to widget data.
 * Preserves document layout while hiding sensitive data.
 */

import React from 'react';

interface AccessDeniedStateProps {
    widgetType?: string;
    title?: string;
    message?: string;
    showContactAdmin?: boolean;
}

export function AccessDeniedState({
    widgetType,
    title = 'Access Restricted',
    message = 'You don\'t have permission to view this data.',
    showContactAdmin = true,
}: AccessDeniedStateProps) {
    return (
        <div className="w-full p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex flex-col items-center text-center">
                {/* Lock Icon */}
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg
                        className="w-6 h-6 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {title}
                </h3>

                {/* Widget Type Badge */}
                {widgetType && (
                    <span className="mt-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {widgetType}
                    </span>
                )}

                {/* Message */}
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    {message}
                </p>

                {/* Contact Admin */}
                {showContactAdmin && (
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        Contact your workspace administrator for access.
                    </p>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Blurred Content Variant
// ============================================================

interface BlurredAccessDeniedProps {
    widgetType?: string;
    children?: React.ReactNode;
}

export function BlurredAccessDenied({ widgetType, children }: BlurredAccessDeniedProps) {
    return (
        <div className="relative w-full overflow-hidden rounded-lg">
            {/* Blurred Background Content */}
            <div className="blur-sm pointer-events-none select-none opacity-50">
                {children || (
                    <div className="p-4 bg-gray-100 dark:bg-gray-800">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6" />
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <div className="text-center p-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg
                            className="w-5 h-5 text-gray-500 dark:text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Access Restricted
                    </p>
                    {widgetType && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {widgetType}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
