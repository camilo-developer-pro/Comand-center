// src/modules/editor/components/EditorWrapper.tsx
'use client'

import dynamic from 'next/dynamic'
import { CustomSchema } from '../schema'
import { PartialBlock } from '@blocknote/core'

const Editor = dynamic(() => import('./Editor'), {
    ssr: false,
    loading: () => (
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    ),
})

interface EditorWrapperProps {
    documentId: string
    initialContent?: PartialBlock<any>[]
    workspaceId: string
    title: string
    onSaveStatusChange?: (status: 'saved' | 'saving' | 'unsaved') => void
}

export function EditorWrapper({
    documentId,
    initialContent,
    workspaceId,
    title,
    onSaveStatusChange
}: EditorWrapperProps) {
    return (
        <Editor
            documentId={documentId}
            initialContent={initialContent}
            workspaceId={workspaceId}
            title={title}
            onSaveStatusChange={onSaveStatusChange}
        />
    )
}
