import Link from 'next/link';
import { getCurrentUser } from '@/modules/core/auth/actions/authActions';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui';
import { DocumentsEmptyState } from '@/components/ui/empty-states';

/**
 * Documents List Page
 * Displays all documents in the user's workspace.
 */
export default async function DocumentsPage() {
    const userData = await getCurrentUser();
    const user = userData?.user;
    const workspaceId = userData?.workspace?.id;

    if (!user) {
        return null; // Layout handles redirect
    }

    if (!workspaceId) {
        return (
            <div className="p-8">
                <EmptyState
                    icon={
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    }
                    title="Workspace not found"
                    description="You are not currently in a workspace. Please join one or create a new one to get started."
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                    action={{
                        label: 'Create Workspace',
                        href: '/settings',
                    }}
                />
            </div>
        );
    }

    const supabase = await createClient();

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
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
                                className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm transition-all"
                            >
                                <h3 className="font-medium text-gray-900 dark:text-white">{doc.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Last edited: {new Date(doc.updated_at).toLocaleDateString()}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <DocumentsEmptyState />
                )}
            </div>
        </div>
    );
}
