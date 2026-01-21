'use client';

/**
 * CommandCenterEditor
 * 
 * V1.1 Phase 3: Widget Insertion UX
 * 
 * The primary editor component for Command Center documents.
 * Integrates custom widget blocks, intelligent slash commands, and auto-save.
 */

import React, { useCallback, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote, SuggestionMenuController } from '@blocknote/react';
import { PartialBlock } from '@blocknote/core';
import '@blocknote/mantine/style.css';

import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { saveDocumentContent } from '../actions/documentActions';
import { widgetBlockSchema, insertWidgetBlock } from '../blocks/widgetBlockSchema';
import { getCustomSlashMenuItems } from './SlashMenuItems';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { WidgetPicker } from './WidgetPicker';

interface CommandCenterEditorProps {
    documentId?: string;
    initialContent?: string | any[];
    workspaceId?: string;
    title?: string;
    onSaveStatusChange?: (status: 'saved' | 'saving' | 'unsaved') => void;
    onContentChange?: (content: any[]) => void;
    onSave?: (content: any[]) => Promise<void>;
    debounceMs?: number;
    className?: string;
}

export function CommandCenterEditor({
    documentId = 'test-doc',
    initialContent,
    workspaceId = 'test-workspace',
    title = 'Document Editor',
    onSaveStatusChange,
    onContentChange,
    onSave,
    debounceMs = 1000,
    className,
}: CommandCenterEditorProps) {
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Helper to parse content if it comes as string
    const getInitialContent = useCallback(() => {
        if (!initialContent) return undefined;
        if (typeof initialContent === 'string') {
            try {
                return JSON.parse(initialContent);
            } catch (e) {
                console.error('Failed to parse initial content string', e);
                return undefined;
            }
        }
        return initialContent;
    }, [initialContent]);

    // Initialize editor with our custom widget schema
    const editor = useCreateBlockNote({
        schema: widgetBlockSchema as any,
        initialContent: getInitialContent() as any,
    });

    // Auto-save logic using our custom hook
    const performSave = useCallback(async (content: any) => {
        // Handle callback-based save for test pages
        if (onSave) {
            onSaveStatusChange?.('saving');
            try {
                await onSave(content);
                onSaveStatusChange?.('saved');
                setSaveError(null);
            } catch (e) {
                setSaveError('Save failed');
                onSaveStatusChange?.('unsaved');
            }
            return;
        }

        // Handle server action save for real pages
        if (!documentId) return;

        onSaveStatusChange?.('saving');
        try {
            const result = await saveDocumentContent({
                documentId,
                content: content as any,
            });

            if (result.success) {
                onSaveStatusChange?.('saved');
                setSaveError(null);
            } else {
                setSaveError(result.error || 'Failed to save');
                onSaveStatusChange?.('unsaved');
            }
        } catch (error) {
            console.error('Failed to save document:', error);
            setSaveError('Network error');
            onSaveStatusChange?.('unsaved');
        }
    }, [documentId, onSaveStatusChange, onSave]);

    const { debouncedFn: debouncedSave } = useDebounce(performSave, debounceMs);

    // Handle content changes
    const handleChange = useCallback(() => {
        onSaveStatusChange?.('unsaved');
        onContentChange?.(editor.document as any[]);
        debouncedSave(editor.document);
    }, [editor, debouncedSave, onSaveStatusChange, onContentChange]);

    return (
        <div className={cn("flex flex-col h-full bg-white dark:bg-gray-950", className)}>
            {/* Editor Toolbar/Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-md">
                        {title}
                    </h1>

                    {/* Insert Widget Button */}
                    <button
                        onClick={() => setIsPickerOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                        title="Insert interactive widget"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Widget
                    </button>
                </div>

                <SaveStatusIndicator
                    isSaving={false}
                    lastSaved={null}
                    hasUnsavedChanges={false}
                    error={saveError}
                />
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto py-12 px-8">
                    <BlockNoteView
                        editor={editor as any}
                        onChange={handleChange}
                        slashMenu={false}
                        theme="light"
                    >
                        <SuggestionMenuController
                            triggerCharacter="/"
                            getItems={async (query) => {
                                const allItems = getCustomSlashMenuItems(editor);
                                return allItems.filter(item =>
                                    item.title.toLowerCase().includes(query.toLowerCase()) ||
                                    item.aliases?.some((a: string) => a.toLowerCase().includes(query.toLowerCase()))
                                );
                            }}
                        />
                    </BlockNoteView>
                </div>
            </div>

            {/* Widget Picker Modal */}
            <WidgetPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={(type) => {
                    insertWidgetBlock(editor, type);
                    setIsPickerOpen(false);
                }}
            />
        </div>
    );
}

export default CommandCenterEditor;
