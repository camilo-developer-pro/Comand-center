'use client';

interface PlaceholderWidgetProps {
    widgetType: string;
}

/**
 * Placeholder widget shown for unimplemented widget types.
 * Useful during development and for graceful degradation.
 */
export function PlaceholderWidget({ widgetType }: PlaceholderWidgetProps) {
    return (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 my-2">
            <div className="flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">
                    {widgetType}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Widget not yet implemented
                </p>
            </div>
        </div>
    );
}
