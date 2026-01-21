'use client';

/**
 * Super Admin Badge
 * 
 * Visual indicator shown when logged in as super admin.
 */

import { useSuperAdmin } from '../hooks/useSuperAdmin';

export function SuperAdminBadge() {
    const { data: isSuperAdmin, isLoading } = useSuperAdmin();

    if (isLoading || !isSuperAdmin) {
        return null;
    }

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-sm animate-in fade-in zoom-in duration-300"
            title="Super Admin Mode Active"
        >
            <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path
                    fillRule="evenodd"
                    d="M10 1l3 6 6 .75-4.5 4.5L15.5 19 10 16l-5.5 3 1-6.75L1 7.75 7 7l3-6z"
                    clipRule="evenodd"
                />
            </svg>
            Super Admin
        </span>
    );
}
