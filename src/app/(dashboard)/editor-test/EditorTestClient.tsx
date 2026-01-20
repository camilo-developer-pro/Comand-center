'use client';

/**
 * Editor Test Client Component
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * Client-side editor component for testing.
 */

import React, { useState, useCallback } from 'react';
import { Block } from '@blocknote/core';
import { CommandCenterEditor } from '@/modules/editor/components/CommandCenterEditor';
import { toast } from 'sonner';

// Sample initial content with some text
const INITIAL_CONTENT: Block[] = [
    {
        id: 'heading-1',
        type: 'heading',
        props: {
            level: 1,
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
        },
        content: [{ type: 'text', text: 'Welcome to Command Center', styles: {} }],
        children: [],
    },
    {
        id: 'paragraph-1',
        type: 'paragraph',
        props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
        },
        content: [
            { type: 'text', text: 'This is a test document. Try inserting a widget below by typing ', styles: {} },
            { type: 'text', text: '/leads', styles: { code: true } },
            { type: 'text', text: ' or clicking the "Insert Widget" button.', styles: {} },
        ],
        children: [],
    },
    {
        id: 'paragraph-2',
        type: 'paragraph',
        props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
        },
        content: [],
        children: [],
    },
] as any;

export function EditorTestClient() {
    const [content, setContent] = useState<Block[]>(INITIAL_CONTENT);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Handle content changes
    const handleContentChange = useCallback((newContent: Block[]) => {
        setContent(newContent);
    }, []);

    // Handle save
    const handleSave = useCallback(async (contentToSave: Block[]) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // In real app, this would save to database
        console.log('[EditorTestClient] Saving content:', contentToSave);
        setLastSaved(new Date());

        // Log widget blocks for debugging
        const widgets = contentToSave.filter((block: any) => block.type === 'widget');
        if (widgets.length > 0) {
            console.log('[EditorTestClient] Widget blocks:', widgets);
        }
    }, []);

    // Export content as JSON
    const handleExport = useCallback(() => {
        const json = JSON.stringify(content, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document-content.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Content exported!');
    }, [content]);

    // Log content to console
    const handleLogContent = useCallback(() => {
        console.log('Current content:', content);
        toast.info('Content logged to console');
    }, [content]);

    return (
        <div className="space-y-4">
            {/* Editor Container */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                <CommandCenterEditor
                    initialContent={INITIAL_CONTENT}
                    onContentChange={handleContentChange}
                    onSave={handleSave}
                    debounceMs={1000}
                    className="min-h-[500px]"
                />
            </div>

            {/* Debug Tools */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {lastSaved ? (
                        <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                    ) : (
                        <span>Not saved yet</span>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleLogContent}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Log Content
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Export JSON
                    </button>
                </div>
            </div>

            {/* Content Preview */}
            <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    View Raw Content (JSON)
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(content, null, 2)}
                </pre>
            </details>
        </div>
    );
}
