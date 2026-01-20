'use client';

import type { BaseWidgetProps } from '@/modules/editor/registry';

/**
 * CRM Lead List Widget - Stub Implementation
 * Full implementation in Phase 3.
 */
export function LeadListWidget({ blockId, config, readOnly }: BaseWidgetProps) {
    return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 my-2">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">CRM Lead List</span>
                {readOnly && <span className="text-xs bg-blue-200 px-2 py-0.5 rounded">Read Only</span>}
            </div>
            <p className="text-sm text-blue-600">
                Block ID: {blockId}
            </p>
            <p className="text-xs text-blue-400 mt-1">
                Config: {JSON.stringify(config || {})}
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
                Full implementation coming in Phase 3
            </p>
        </div>
    );
}
