'use client';

/**
 * Placeholder Section Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

interface PlaceholderSectionProps {
    title: string;
    description: string;
}

export function PlaceholderSection({ title, description }: PlaceholderSectionProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center max-w-2xl mx-auto mt-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🚧
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
                {description}
            </p>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Notify me when available
            </button>
        </div>
    );
}
