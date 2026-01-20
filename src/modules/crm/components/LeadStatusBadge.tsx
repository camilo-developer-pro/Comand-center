// src/modules/crm/components/LeadStatusBadge.tsx
'use client'

import { cn } from '@/lib/utils'
import { LeadStatusFilter } from '../types'

interface LeadStatusBadgeProps {
    status: Exclude<LeadStatusFilter, 'all'>
    onClick?: () => void
    isLoading?: boolean
}

const statusConfig: Record<Exclude<LeadStatusFilter, 'all'>, { label: string; className: string }> = {
    new: {
        label: 'New',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    },
    contacted: {
        label: 'Contacted',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    },
    qualified: {
        label: 'Qualified',
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
    },
    lost: {
        label: 'Lost',
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
    },
}

export function LeadStatusBadge({ status, onClick, isLoading }: LeadStatusBadgeProps) {
    const config = statusConfig[status]

    return (
        <button
            onClick={onClick}
            disabled={isLoading || !onClick}
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                config.className,
                onClick && 'cursor-pointer',
                isLoading && 'opacity-50 cursor-wait',
                !onClick && 'cursor-default'
            )}
        >
            {isLoading ? (
                <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {config.label}
                </span>
            ) : (
                config.label
            )}
        </button>
    )
}
