// src/modules/crm/components/AccessDenied.tsx
'use client'

import { ShieldX } from 'lucide-react'

interface AccessDeniedProps {
    message?: string
}

export function AccessDenied({ message = 'You do not have permission to view this content' }: AccessDeniedProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <ShieldX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Access Denied
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
                {message}
            </p>
        </div>
    )
}
