import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditorWrapper } from '@/modules/editor/components/EditorWrapper';
import type { Block } from '@blocknote/core';

interface DocumentPageProps {
    params: Promise<{
        id: string;
    }>;
}

/**
 * Document Editor Page (Server Component)
 * 
 * This is the page shell that:
 * 1. Fetches document data from Supabase
 * 2. Validates user access via RLS
 * 3. Passes initial data to the Client Editor
 */
export default async function DocumentPage({ params }: DocumentPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        notFound(); // Will redirect via layout
    }

    // Fetch document (RLS will filter by workspace)
    const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !document) {
        console.error('[DocumentPage] Document not found or access denied:', error);
        notFound();
    }

    // Parse content safely
    const initialContent = document.content as Block[] | null;

    return (
        <div className="h-screen flex flex-col">
            <EditorWrapper
                documentId={document.id}
                initialContent={initialContent}
                title={document.title}
                workspaceId={document.workspace_id}
                readOnly={false}
            />
        </div>
    );
}

/**
 * Generate metadata for the document page.
 */
export async function generateMetadata({ params }: DocumentPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: document } = await supabase
        .from('documents')
        .select('title')
        .eq('id', id)
        .single();

    return {
        title: document?.title || 'Document',
    };
}
