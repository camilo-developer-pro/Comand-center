import type { Block } from '@blocknote/core';

export interface EditorProps {
    /** Document ID for persistence */
    documentId: string;
    /** Initial content from database */
    initialContent: Block[] | null;
    /** Document title for display */
    title: string;
    /** Workspace ID for context */
    workspaceId: string;
    /** Optional: Make editor read-only */
    readOnly?: boolean;
    /** Optional: Callback when save completes */
    onSaveComplete?: (success: boolean) => void;
    /** Optional: Callback when content changes */
    onContentChange?: (content: Block[]) => void;
}

export interface EditorState {
    isSaving: boolean;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    error: string | null;
}
