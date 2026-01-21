/**
 * General Settings Page
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { getWorkspaceSettings, GeneralSettingsForm } from '@/modules/core/settings';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default async function GeneralSettingsPage() {
    const result = await getWorkspaceSettings();

    if (!result.success) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Error loading settings. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <GeneralSettingsForm workspace={result.data} />

            {/* Appearance Settings */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Appearance</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Customize how the app looks on your device
                        </p>
                    </div>
                    <ThemeToggle variant="dropdown" />
                </div>
            </div>
        </div>
    );
}
