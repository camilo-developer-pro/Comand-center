'use client';

/**
 * Editable Document Title Component
 * V1.1 Phase 6: Optimistic UI & Polish
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUpdateDocumentTitle } from '../hooks/useDocumentMutations';
import { cn } from '@/lib/utils';

interface EditableDocumentTitleProps {
    documentId: string;
    initialTitle: string;
    className?: string;
}

export function EditableDocumentTitle({
    documentId,
    initialTitle,
    className,
}: EditableDocumentTitleProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const inputRef = useRef<HTMLInputElement>(null);
    const { mutate: updateTitle, isPending } = useUpdateDocumentTitle();

    // Sync with external changes when not editing
    useEffect(() => {
        if (!isEditing) {
            setTitle(initialTitle);
        }
    }, [initialTitle, isEditing]);

    // Focus input and select text when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = useCallback(() => {
        const trimmedTitle = title.trim();

        if (trimmedTitle && trimmedTitle !== initialTitle) {
            updateTitle({ documentId, title: trimmedTitle });
        } else {
            setTitle(initialTitle); // Reset if empty or unchanged
        }

        setIsEditing(false);
    }, [title, initialTitle, documentId, updateTitle]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setTitle(initialTitle);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                className={cn(
                    'bg-transparent border-b-2 border-blue-500 outline-none transition-all',
                    'text-lg font-semibold text-gray-900 dark:text-white',
                    'w-full min-w-[200px] py-0',
                    isPending && 'opacity-50 cursor-wait',
                    className
                )}
                aria-label="Document title"
            />
        );
    }

    return (
        <h1
            onClick={() => setIsEditing(true)}
            className={cn(
                'text-lg font-semibold text-gray-900 dark:text-white',
                'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50',
                'rounded px-1 -mx-1 transition-colors min-h-[1.75rem] flex items-center',
                className
            )}
            title="Click to edit title"
        >
            {title || 'Untitled Document'}
        </h1>
    );
}
