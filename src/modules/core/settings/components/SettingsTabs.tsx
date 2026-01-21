'use client';

/**
 * Settings Tabs ComponentV1.1 Phase 5: Navigation & Dashboard
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SettingsTabs() {
    const pathname = usePathname();

    const tabs = [
        { name: 'General', href: '/settings', exact: true },
        { name: 'Members', href: '/settings/members' },
        { name: 'Billing', href: '/settings/billing' },
        { name: 'Integrations', href: '/settings/integrations' },
        { name: 'Danger Zone', href: '/settings/danger', className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' },
    ];

    function isActive(href: string, exact: boolean = false) {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    }

    return (
        <nav className="w-full md:w-64 flex-shrink-0 space-y-1">
            {tabs.map((tab) => (
                <Link
                    key={tab.name}
                    href={tab.href}
                    className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                        ${isActive(tab.href, tab.exact)
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }
                        ${tab.className || ''}
                    `}
                >
                    {tab.name}
                </Link>
            ))}
        </nav>
    );
}
