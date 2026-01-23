'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { BlockIDExtension } from '../extensions/BlockIDExtension';
import { FractionalIndexExtension } from '../extensions/FractionalIndexExtension';
import { syncBlocks, getDocumentBlocks } from '../actions/documentActions';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { EditableDocumentTitle } from '@/modules/core/documents/components';
import { type BlockEntity } from '../types';
import { toast } from 'sonner';

interface AtomicIngestionEditorProps {
    documentId: string;
    workspaceId: string;
    title: string;
    initialBlocks?: BlockEntity[];
}

export function AtomicIngestionEditor({
    documentId,
    workspaceId,
    title,
    initialBlocks = [],
}: AtomicIngestionEditorProps) {
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [error, setError] = useState<string | null>(null);

    const performSync = useCallback(async (editor: any) => {
        setSaveStatus('saving');

        try {
            const json = editor.getJSON();
            const blocksToSync: BlockEntity[] = [];

            // Extract blocks from TipTap JSON
            // TipTap JSON structure: { type: 'doc', content: [...] }
            if (json.content) {
                json.content.forEach((node: any) => {
                    if (node.attrs?.id) {
                        blocksToSync.push({
                            id: node.attrs.id,
                            document_id: documentId,
                            content: node,
                            type: node.type,
                            sort_order: node.attrs.sortOrder,
                            parent_path: 'root', // Default to root for now
                        });
                    }
                });
            }

            if (blocksToSync.length > 0) {
                const result = await syncBlocks({
                    documentId,
                    blocks: blocksToSync,
                });

                if (result.success) {
                    setSaveStatus('saved');
                    setError(null);
                } else {
                    setSaveStatus('unsaved');
                    setError(result.error || 'Failed to sync blocks');
                }
            } else {
                setSaveStatus('saved');
            }
        } catch (err) {
            console.error('[AtomicIngestionEditor] Sync failed:', err);
            setSaveStatus('unsaved');
            setError('Network error');
        }
    }, [documentId]);

    const { debouncedFn: debouncedSync } = useDebounce(performSync, 1500);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start typing your knowledge...',
            }),
            Link.configure({
                openOnClick: false,
            }),
            BlockIDExtension,
            FractionalIndexExtension,
        ],
        content: {
            type: 'doc',
            content: initialBlocks.length > 0
                ? initialBlocks.map(b => b.content)
                : [{ type: 'paragraph' }],
        },
        onUpdate: ({ editor }) => {
            setSaveStatus('unsaved');
            debouncedSync(editor);
        },
    });

    // Optional: Load blocks if not provided
    useEffect(() => {
        if (initialBlocks.length === 0 && editor) {
            getDocumentBlocks(documentId).then(result => {
                if (result.success && result.data && result.data.length > 0) {
                    editor.commands.setContent({
                        type: 'doc',
                        content: result.data.map(b => b.content),
                    });
                }
            });
        }
    }, [documentId, editor]);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <EditableDocumentTitle
                    documentId={documentId}
                    initialTitle={title}
                />
                <div className="flex items-center gap-4">
                    <SaveStatusIndicator
                        isSaving={saveStatus === 'saving'}
                        lastSaved={null}
                        hasUnsavedChanges={saveStatus === 'unsaved'}
                        error={error}
                    />
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto scrollbar-hide">
                <div className="max-w-3xl mx-auto py-12 px-6">
                    <EditorContent
                        editor={editor}
                        className="prose prose-slate prose-lg max-w-none focus:outline-none"
                    />
                </div>
            </div>

            {/* Editor Footer / Info (Optional) */}
            <div className="px-6 py-2 border-t border-gray-50 text-[10px] text-gray-400 flex justify-between">
                <span>V3.1 Atomic Ingestion Layer Active</span>
                <span>Ready</span>
            </div>
        </div>
    );
}

export default AtomicIngestionEditor;
