// src/app/(dashboard)/documents/[id]/page.tsx
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditorWrapper } from '@/modules/editor/components/EditorWrapper'
import { WorkspaceProvider } from '@/modules/core/hooks/useWorkspace'

interface DocumentPageProps {
    params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch document with workspace info
    const { data: document, error } = await supabase
        .from('documents')
        .select(`
      id,
      title,
      content,
      workspace_id,
      workspaces (
        id,
        name
      )
    `)
        .eq('id', id)
        .single()

    if (error || !document) {
        notFound()
    }

    // Proper cast for workspaces relation
    const workspaces = document.workspaces as unknown as { id: string; name: string } | null;

    return (
        <WorkspaceProvider
            workspaceId={document.workspace_id}
            workspaceName={workspaces?.name ?? null}
        >
            <div className="min-h-screen bg-white dark:bg-gray-950">
                <main className="h-screen flex flex-col">
                    <Suspense fallback={<div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
                        <EditorWrapper
                            documentId={document.id}
                            initialContent={document.content as any}
                            workspaceId={document.workspace_id}
                            title={document.title}
                        />
                    </Suspense>
                </main>
            </div>
        </WorkspaceProvider>
    )
}

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
