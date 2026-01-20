'use client';

import { useCallback, useState, useMemo } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import '@blocknote/mantine/style.css';

import { useDebounce } from '@/lib/hooks/useDebounce';
import { saveDocumentContent } from '../actions/documentActions';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import type { EditorProps, EditorState } from './Editor.types';

/**
 * Command Center Editor Component
 * 
 * A rich text editor built on BlockNote that:
 * 1. Renders document content from JSONB
 * 2. Auto-saves changes via debounced Server Action
 * 3. Supports custom widget blocks (via Registry - Phase 3)
 * 
 * @param props - EditorProps including documentId, initialContent, etc.
 */
export function Editor({
    documentId,
    initialContent,
    title,
    readOnly = false,
    onSaveComplete,
    onContentChange,
}: EditorProps) {
    // Editor state management
    const [editorState, setEditorState] = useState<EditorState>({
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: null,
    });

    // Save function that calls the Server Action
    const performSave = useCallback(
        async (content: Block[]) => {
            setEditorState(prev => ({ ...prev, isSaving: true, error: null }));

            try {
                const result = await saveDocumentContent({
                    documentId,
                    content,
                });

                if (result.success) {
                    setEditorState(prev => ({
                        ...prev,
                        isSaving: false,
                        lastSaved: new Date(),
                        hasUnsavedChanges: false,
                    }));
                    onSaveComplete?.(true);
                } else {
                    setEditorState(prev => ({
                        ...prev,
                        isSaving: false,
                        error: result.error || 'Failed to save',
                    }));
                    onSaveComplete?.(false);
                }
            } catch (err) {
                console.error('[Editor] Save error:', err);
                setEditorState(prev => ({
                    ...prev,
                    isSaving: false,
                    error: 'Network error - changes not saved',
                }));
                onSaveComplete?.(false);
            }
        },
        [documentId, onSaveComplete]
    );

    // Debounced save (1 second delay)
    const { debouncedFn: debouncedSave } = useDebounce(performSave, 1000);

    // Handle content changes from BlockNote
    const handleChange = useCallback(
        (editor: BlockNoteEditor) => {
            const content = editor.document as Block[];

            setEditorState(prev => ({ ...prev, hasUnsavedChanges: true }));
            onContentChange?.(content);

            if (!readOnly) {
                debouncedSave(content);
            }
        },
        [debouncedSave, onContentChange, readOnly]
    );

    // Parse initial content safely
    const parsedInitialContent = useMemo(() => {
        if (!initialContent || !Array.isArray(initialContent)) {
            return undefined; // BlockNote will use default empty state
        }
        return initialContent;
    }, [initialContent]);

    // Create the BlockNote editor instance
    const editor = useCreateBlockNote({
        initialContent: parsedInitialContent,
    });

    return (
        <div className="flex flex-col h-full">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {title}
                </h1>
                <SaveStatusIndicator
                    isSaving={editorState.isSaving}
                    lastSaved={editorState.lastSaved}
                    hasUnsavedChanges={editorState.hasUnsavedChanges}
                    error={editorState.error}
                />
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl mx-auto py-8 px-4">
                    <BlockNoteView
                        editor={editor}
                        editable={!readOnly}
                        onChange={() => handleChange(editor)}
                        theme="light"
                    />
                </div>
            </div>

            {/* Editor Footer - Error Display */}
            {editorState.error && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                    <p className="text-sm text-red-600">{editorState.error}</p>
                </div>
            )}
        </div>
    );
}
