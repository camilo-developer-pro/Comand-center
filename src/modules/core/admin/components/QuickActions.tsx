'use client';

/**
 * Quick Actions
 * 
 * Common admin actions in one place.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function QuickActions() {
    const router = useRouter();

    const actions = [
        {
            label: 'Create Test Workspace',
            description: 'Create a new workspace for testing',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
            color: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
            href: '/onboarding',
        },
        {
            label: 'View All Documents',
            description: 'Browse documents across all workspaces',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
            href: '/admin/workspaces',
        },
        {
            label: 'System Settings',
            description: 'Configure system-wide settings',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
            href: '/settings',
        },
        {
            label: 'Export Audit Log',
            description: 'Download activity log as CSV',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
            onClick: () => {
                toast.info('Export feature coming soon');
            },
        },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                    Quick Actions
                </h2>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {actions.map((action) => {
                    const Component = action.href ? Link : 'button';
                    const props = (action.href
                        ? { href: action.href }
                        : { onClick: action.onClick }) as any;

                    return (
                        <Component
                            key={action.label}
                            {...props}
                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors text-left"
                        >
                            <div className={`inline-flex p-2 rounded-lg ${action.color} mb-3`}>
                                {action.icon}
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                                {action.label}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {action.description}
                            </p>
                        </Component>
                    );
                })}
            </div>
        </div>
    );
}
