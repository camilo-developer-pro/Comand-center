/**
 * Dashboard Header Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { getCurrentUser } from '@/modules/core/auth/actions/authActions';

export async function DashboardHeader() {
    const userData = await getCurrentUser();
    const userName = userData?.user?.fullName || 'User';

    return (
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                👋 Welcome back, {userName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
                Your Command Center overview
            </p>
        </div>
    );
}
