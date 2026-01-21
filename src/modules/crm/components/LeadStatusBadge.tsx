'use client';

/**
 * Lead Status Badge Component with Dropdown
 * V1.1 Phase 6: Optimistic UI & Polish
 */

import { useState } from 'react';
import { useUpdateLeadStatus } from '../hooks/useLeads';
import type { LeadStatus } from '../types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
    new: {
        label: 'New',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    },
    contacted: {
        label: 'Contacted',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    qualified: {
        label: 'Qualified',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    proposal: {
        label: 'Proposal',
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    negotiation: {
        label: 'Negotiation',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    },
    won: {
        label: 'Won',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    lost: {
        label: 'Lost',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    },
};

const STATUS_ORDER: LeadStatus[] = [
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost'
];

interface LeadStatusBadgeProps {
    leadId: string;
    currentStatus: LeadStatus;
    readonly?: boolean;
}

export function LeadStatusBadge({ leadId, currentStatus, readonly = false }: LeadStatusBadgeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { mutate: updateStatus, isPending } = useUpdateLeadStatus();

    const config = STATUS_CONFIG[currentStatus];

    const handleStatusChange = (newStatus: LeadStatus) => {
        if (newStatus !== currentStatus) {
            updateStatus({ leadId, status: newStatus });
        }
        setIsOpen(false);
    };

    if (readonly) {
        return (
            <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                config.className
            )}>
                {config.label}
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-500',
                    'transition-all duration-150',
                    config.className,
                    isPending && 'opacity-50 animate-pulse'
                )}
            >
                {config.label}
                <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute z-20 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
                        {STATUS_ORDER.map((status) => (
                            <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                className={cn(
                                    'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors',
                                    'flex items-center gap-2',
                                    status === currentStatus && 'bg-gray-50 dark:bg-gray-700 font-medium'
                                )}
                            >
                                <span className={cn(
                                    'w-2 h-2 rounded-full',
                                    STATUS_CONFIG[status].className.split(' ')[0]
                                )} />
                                {STATUS_CONFIG[status].label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
