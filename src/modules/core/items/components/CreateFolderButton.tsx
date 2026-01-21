'use client';

/**
 * CreateFolderButton Component
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Inline folder creation component with toggle between button and input.
 * Supports keyboard shortcuts for quick folder creation.
 */

import { useState } from 'react';
import { useCreateFolder } from '../hooks/useItems';
import { toast } from 'sonner';

interface CreateFolderButtonProps {
    workspaceId: string;
    parentId?: string | null;
    onCreated?: (folderId: string) => void;
}

/**
 * Button to create new folders with inline input
 */
export function CreateFolderButton({
    workspaceId,
    parentId = null,
    onCreated,
}: CreateFolderButtonProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const createFolder = useCreateFolder(workspaceId);

    const handleCreate = async () => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            setIsCreating(false);
            setName('');
            return;
        }

        try {
            const result = await createFolder.mutateAsync({
                name: trimmedName,
                parentId,
                workspaceId,
            });

            if (result.success) {
                toast.success(`Folder "${trimmedName}" created`);
                setName('');
                setIsCreating(false);

                if (onCreated && result.data) {
                    onCreated(result.data.id);
                }
            } else {
                toast.error(result.error || 'Failed to create folder');
            }
        } catch (error) {
            console.error('Failed to create folder:', error);
            toast.error('Failed to create folder');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreate();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsCreating(false);
            setName('');
        }
    };

    if (isCreating) {
        return (
            <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="text-base">📁</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleCreate}
                    placeholder="Folder name..."
                    maxLength={100}
                    className="flex-1 text-sm bg-transparent border-b border-blue-400 dark:border-blue-500 outline-none focus:border-blue-600 dark:focus:border-blue-400 px-1 py-0.5"
                    autoFocus
                    aria-label="New folder name"
                />
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsCreating(true)}
            disabled={createFolder.isPending}
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Create new folder"
        >
            <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Folder</span>
        </button>
    );
}
