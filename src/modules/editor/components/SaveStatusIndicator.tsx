'use client';

interface SaveStatusIndicatorProps {
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    error: string | null;
}

export function SaveStatusIndicator({
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error,
}: SaveStatusIndicatorProps) {
    if (error) {
        return (
            <div className="flex items-center gap-1.5 text-red-600 text-sm">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Error saving</span>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                <span>Saving...</span>
            </div>
        );
    }

    if (hasUnsavedChanges) {
        return (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>Unsaved changes</span>
            </div>
        );
    }

    if (lastSaved) {
        return (
            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Saved</span>
            </div>
        );
    }

    return null;
}
