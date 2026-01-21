// src/modules/editor/components/Editor.tsx
'use client'

import { useCallback, useState } from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import {
    useCreateBlockNote,
    SuggestionMenuController,
} from '@blocknote/react'
import { PartialBlock } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { saveDocument } from '../actions/documentActions'
import { customSchema, CustomSchema } from '../schema'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcuts'
import { toast } from 'sonner'
import { getCustomSlashMenuItems } from './SlashMenuItems'
import { SaveStatusIndicator } from './SaveStatusIndicator'
import { EditableDocumentTitle } from '@/modules/core/documents/components'

interface EditorProps {
    documentId: string
    initialContent?: PartialBlock<any>[]
    workspaceId: string
    title: string
    onSaveStatusChange?: (status: 'saved' | 'saving' | 'unsaved') => void
}

export function Editor({
    documentId,
    initialContent,
    workspaceId,
    title,
    onSaveStatusChange
}: EditorProps) {
    const [saveError, setSaveError] = useState<string | null>(null);

    // Create editor with custom schema
    const editor = useCreateBlockNote({
        schema: customSchema,
        initialContent: initialContent as any,
    })

    // Auto-save logic
    const performSave = useCallback(async (content: any) => {
        onSaveStatusChange?.('saving')
        try {
            const result = await saveDocument({
                documentId,
                content,
            })
            if (result.success) {
                onSaveStatusChange?.('saved')
                setSaveError(null)
            } else {
                setSaveError(result.error || 'Failed to save')
                onSaveStatusChange?.('unsaved')
            }
        } catch (error) {
            console.error('Failed to save document:', error)
            setSaveError('Network error')
            onSaveStatusChange?.('unsaved')
        }
    }, [documentId, onSaveStatusChange])

    const { debouncedFn: debouncedSave } = useDebounce(performSave, 1000)

    // Manual save shortcut (Cmd+S)
    const handleSaveShortcut = useCallback(() => {
        performSave(editor.document)
        toast.success('Document saved')
    }, [editor, performSave])

    useKeyboardShortcut('s', handleSaveShortcut, { meta: true, ctrl: true })

    // Handle content changes
    const handleChange = useCallback(() => {
        onSaveStatusChange?.('unsaved')
        debouncedSave(editor.document)
    }, [editor, debouncedSave, onSaveStatusChange])

    return (
        <div className="flex flex-col h-full">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                <EditableDocumentTitle
                    documentId={documentId}
                    initialTitle={title}
                />
                <SaveStatusIndicator
                    isSaving={false}
                    lastSaved={null}
                    hasUnsavedChanges={false}
                    error={saveError}
                />
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl mx-auto py-8 px-4">
                    <BlockNoteView
                        editor={editor as any}
                        onChange={handleChange}
                        slashMenu={false}
                        theme="light"
                    >
                        <SuggestionMenuController
                            triggerCharacter="/"
                            getItems={async (query) => {
                                const items = getCustomSlashMenuItems(editor as any)
                                return items.filter(
                                    (item) =>
                                        item.title.toLowerCase().includes(query.toLowerCase()) ||
                                        item.aliases?.some((alias: string) =>
                                            alias.toLowerCase().includes(query.toLowerCase())
                                        )
                                )
                            }}
                        />
                    </BlockNoteView>
                </div>
            </div>
        </div>
    )
}

export default Editor
