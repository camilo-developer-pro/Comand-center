import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { DocumentEditor } from '@/modules/editor/components/DocumentEditor';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';

interface DocumentPageProps {
  params: { id: string };
}

async function getDocument(documentId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const document = await db
    .selectFrom('documents')
    .select(['id', 'title', 'workspace_id', 'content'])
    .where('id', '=', documentId)
    .executeTakeFirst();
  
  return document;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const document = await getDocument(params.id);
  
  if (!document) {
    notFound();
  }
  
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<DocumentEditorSkeleton />}>
        <DocumentEditor
          documentId={document.id}
          title={document.title}
          initialContent={document.content as Record<string, unknown> | undefined}
          className="flex-1 flex flex-col"
        />
      </Suspense>
    </div>
  );
}

function DocumentEditorSkeleton() {
  return (
    <div className="flex-1 animate-pulse p-4 space-y-4">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export async function generateMetadata({ params }: DocumentPageProps) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: document } = await supabase
        .from('documents')
        .select('title')
        .eq('id', id)
        .single();

    return {
        title: document?.title || 'Document',
    };
}
