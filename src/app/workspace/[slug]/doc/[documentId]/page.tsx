import { Suspense } from 'react';
import { DocumentEditor } from '@/modules/editor/components/DocumentEditor';
import { getDocumentById } from '@/lib/actions/document-actions';
import { getWorkspaceBySlug } from '@/lib/actions/workspace-actions';
import { notFound } from 'next/navigation';
import { DocumentTree } from '@/modules/editor/components/Sidebar/DocumentTree';

interface PageProps {
  params: Promise<{ slug: string; documentId: string }>;
}

export default async function DocumentPage({ params }: PageProps) {
  // Next.js 15: Await params
  const { slug, documentId } = await params;
  
  // Fetch workspace metadata to get workspaceId
  const workspaceResult = await getWorkspaceBySlug(slug);
  
  if (!workspaceResult.success || !workspaceResult.data) {
    notFound();
  }
  
  const workspaceId = workspaceResult.data.id;
  
  // Fetch document metadata (Server Component)
  const documentResult = await getDocumentById(documentId);
  
  if (!documentResult.success || !documentResult.data) {
    notFound();
  }
  
  return (
    <div className="flex h-screen">
      {/* Sidebar - Loaded via Client Component */}
      <aside className="w-64 border-r bg-muted/30 overflow-y-auto">
        <Suspense fallback={<div className="p-4">Loading sidebar...</div>}>
          <DocumentTree workspaceId={workspaceId} />
        </Suspense>
      </aside>
      
      {/* Main Editor Area */}
      <main className="flex-1 overflow-y-auto">
        <DocumentEditor 
          documentId={documentId}
          initialTitle={documentResult.data.title}
        />
      </main>
    </div>
  );
}