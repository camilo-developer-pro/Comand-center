'use client';

/**
 * Settings Header Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

interface SettingsHeaderProps {
    workspaceName: string;
}

export function SettingsHeader({ workspaceName }: SettingsHeaderProps) {
    const initials = workspaceName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-lg bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                {initials}
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Workspace Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Manage your workspace preferences
                </p>
            </div>
        </div>
    );
}
