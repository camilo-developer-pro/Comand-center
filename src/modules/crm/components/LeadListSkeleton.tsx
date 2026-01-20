// src/modules/crm/components/LeadListSkeleton.tsx
'use client'

export function LeadListSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                </div>
            ))}
        </div>
    )
}
