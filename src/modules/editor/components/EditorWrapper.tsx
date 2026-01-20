'use client';

import dynamic from 'next/dynamic';
import type { EditorProps } from './Editor.types';

/**
 * Loading skeleton for the Editor.
 * Displayed while the heavy BlockNote bundle is loading.
 */
function EditorLoadingSkeleton() {
    return (
        <div className="flex flex-col h-full animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                <div className="h-6 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>

            {/* Content skeleton */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl mx-auto py-8 px-4 space-y-4">
                    <div className="h-8 w-3/4 bg-gray-100 rounded" />
                    <div className="h-4 w-full bg-gray-100 rounded" />
                    <div className="h-4 w-5/6 bg-gray-100 rounded" />
                    <div className="h-4 w-4/6 bg-gray-100 rounded" />
                    <div className="h-20 w-full bg-gray-50 rounded border border-gray-200" />
                    <div className="h-4 w-full bg-gray-100 rounded" />
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                </div>
            </div>
        </div>
    );
}

/**
 * Dynamically imported Editor component.
 * This wrapper ensures BlockNote is only loaded client-side
 * and provides a loading skeleton during initial load.
 */
const DynamicEditor = dynamic(
    () => import('./Editor').then(mod => mod.Editor),
    {
        loading: () => <EditorLoadingSkeleton />,
        ssr: false,
    }
);

/**
 * EditorWrapper - The public interface for the Editor module.
 * 
 * Use this component in page shells. It handles:
 * 1. Dynamic import of BlockNote (code splitting)
 * 2. SSR prevention (BlockNote requires browser APIs)
 * 3. Loading state management
 */
export function EditorWrapper(props: EditorProps) {
    return <DynamicEditor {...props} />;
}
