import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/**
 * Documents List Page
 * Displays all documents in the user's workspace.
 */
export default async function DocumentsPage() {
    const supabase = await createClient();

    // Get current user's profile to find their workspace
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null; // Layout handles redirect
    }

    // Get user's workspace membership
    const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

    const workspaceId = membership?.workspace_id;

    if (!workspaceId) {
        return (
            <div className="p-8">
                <div className="max-w-4xl mx-auto text-center py-12 bg-white rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Workspace not found</h3>
                    <p className="text-gray-500 mb-4">Please contact your administrator or join a workspace.</p>
                </div>
            </div>
        );
    }

    // Fetch documents for the workspace
    const { data: documents, error } = await supabase
        .from('documents')
        .select('id, title, updated_at')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[DocumentsPage] Error fetching documents:', error);
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                    <Link
                        href="/documents/new"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        New Document
                    </Link>
                </div>

                {/* Documents Grid */}
                {documents && documents.length > 0 ? (
                    <div className="grid gap-4">
                        {documents.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/documents/${doc.id}`}
                                className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                                <h3 className="font-medium text-gray-900">{doc.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Last edited: {new Date(doc.updated_at).toLocaleDateString()}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                        <p className="text-gray-500 mb-4">Create your first document to get started.</p>
                        <Link
                            href="/documents/new"
                            className="inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                            Create Document
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
