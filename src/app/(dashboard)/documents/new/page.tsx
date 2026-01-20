import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createDocument } from '@/modules/editor/actions/documentActions';

/**
 * New Document Page
 * Creates a new document and redirects to the editor.
 */
export default async function NewDocumentPage() {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's workspace
    const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

    if (!membership?.workspace_id) {
        // User has no workspace - redirect to setup
        redirect('/settings');
    }

    // Create new document
    const result = await createDocument(membership.workspace_id);

    if (result.success && result.data) {
        redirect(`/documents/${result.data.id}`);
    }

    // If creation failed, show error
    return (
        <div className="p-8">
            <div className="max-w-md mx-auto text-center">
                <h1 className="text-xl font-bold text-red-600 mb-2">
                    Failed to create document
                </h1>
                <p className="text-gray-600 mb-4">
                    {result.error || 'An unexpected error occurred'}
                </p>
                <a
                    href="/documents"
                    className="text-blue-600 hover:underline"
                >
                    Return to documents
                </a>
            </div>
        </div>
    );
}
