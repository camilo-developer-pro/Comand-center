/**
 * Settings Layout
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { SettingsHeader, SettingsTabs } from '@/modules/core/settings';
import { getCurrentUser } from '@/modules/core/auth/actions/authActions';

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userData = await getCurrentUser();
    const workspaceName = userData?.workspace?.name || 'Workspace';

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <SettingsHeader workspaceName={workspaceName} />

            <div className="flex flex-col md:flex-row gap-8">
                <SettingsTabs />
                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
