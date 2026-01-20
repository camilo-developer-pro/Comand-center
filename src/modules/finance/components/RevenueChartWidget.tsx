'use client';

import type { BaseWidgetProps } from '@/modules/editor/registry';

/**
 * Revenue Chart Widget - Stub Implementation
 * Full implementation in future version.
 */
export function RevenueChartWidget({ blockId, config, readOnly }: BaseWidgetProps) {
    return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 my-2">
            <div className="flex items-center gap-2 text-green-700 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">Revenue Chart</span>
                {readOnly && <span className="text-xs bg-green-200 px-2 py-0.5 rounded">Read Only</span>}
            </div>
            <p className="text-sm text-green-600">
                Block ID: {blockId}
            </p>
            <p className="text-xs text-green-400 mt-1">
                Config: {JSON.stringify(config || {})}
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
                Chart implementation planned for future version
            </p>
        </div>
    );
}
