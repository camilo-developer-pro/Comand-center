/**
 * Quick Actions Card Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import Link from 'next/link';

export function QuickActionsCard() {
    const actions = [
        {
            title: 'New Document',
            description: 'Start a fresh project',
            href: '/documents/new',
            icon: '➕',
            color: 'text-blue-600'
        },
        {
            title: 'Browse Templates',
            description: 'Use a pre-built layout',
            href: '#',
            icon: '📋',
            color: 'text-green-600',
            disabled: true
        },
        {
            title: 'Invite Team',
            description: 'Collaborate with others',
            href: '#',
            icon: '👥',
            color: 'text-purple-600',
            disabled: true
        },
        {
            title: 'View Settings',
            description: 'Manage your workspace',
            href: '/settings',
            icon: '⚙️',
            color: 'text-orange-600'
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {actions.map((action) => (
                        <Link
                            key={action.title}
                            href={action.href}
                            className={`
                                flex flex-col p-4 rounded-xl border border-gray-100 dark:border-gray-700
                                hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10
                                transition-all group
                                ${action.disabled ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            <span className="text-2xl mb-3">{action.icon}</span>
                            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {action.title}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {action.description}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
