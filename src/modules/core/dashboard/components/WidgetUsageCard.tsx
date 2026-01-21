/**
 * Widget Usage Card Component
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

interface WidgetUsageCardProps {
    breakdown: Record<string, number>;
}

export function WidgetUsageCard({ breakdown }: WidgetUsageCardProps) {
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const maxCount = entries.length > 0 ? entries[0][1] : 0;

    // Helper to format widget names
    const formatLabel = (key: string) => {
        return key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Helper for category colors
    const getBarColor = (key: string) => {
        if (key.includes('crm')) return 'bg-blue-500';
        if (key.includes('revenue') || key.includes('chart')) return 'bg-green-500';
        if (key.includes('task')) return 'bg-purple-500';
        return 'bg-gray-500';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Widget Usage</h3>
            </div>
            <div className="p-6">
                {entries.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No widgets used yet.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {entries.map(([key, count]) => {
                            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                                <div key={key}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {formatLabel(key)}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            {count} {count === 1 ? 'doc' : 'docs'}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getBarColor(key)} transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
