/**
 * General Settings Page
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { getWorkspaceSettings, GeneralSettingsForm } from '@/modules/core/settings';

export default async function GeneralSettingsPage() {
    const { success, data } = await getWorkspaceSettings();

    if (!success || !data) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Error loading settings. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <GeneralSettingsForm workspace={data} />
        </div>
    );
}
