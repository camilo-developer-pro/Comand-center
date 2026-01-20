/**
 * Editor Test Page
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * A dedicated page for testing the editor with widget insertion.
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { EditorTestClient } from './EditorTestClient';

export const metadata: Metadata = {
    title: 'Editor Testing - Command Center',
    description: 'Test page for editor with widget insertion',
};

export default function EditorTestPage() {
    return (
        <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Editor Testing
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Test the BlockNote editor with custom widget blocks.
                </p>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h2 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    How to Insert Widgets
                </h2>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Type <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">/</kbd> to open the slash menu</li>
                    <li>• Search for "leads" or "widget" to find widget options</li>
                    <li>• Click "Insert Widget" button in the toolbar</li>
                    <li>• Hover over widgets to see configuration options</li>
                    <li>• Click the gear icon to configure widget settings</li>
                </ul>
            </div>

            {/* Editor */}
            <Suspense fallback={<EditorSkeleton />}>
                <EditorTestClient />
            </Suspense>
        </div>
    );
}

function EditorSkeleton() {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="h-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-pulse" />
            <div className="h-96 bg-white dark:bg-gray-900 p-4 space-y-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
        </div>
    );
}
