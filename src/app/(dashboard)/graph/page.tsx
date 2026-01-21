import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NeuralGraph } from '@/modules/graph';

// Loading component
function GraphSkeleton() {
    return (
        <div className="w-full h-[calc(100vh-4rem)] bg-slate-50 animate-pulse flex items-center justify-center">
            <div className="text-slate-400">Loading knowledge graph...</div>
        </div>
    );
}

export default async function GraphPage() {
    const supabase = await createClient();

    // Get current user and workspace
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's default workspace
    const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.default_workspace_id) {
        redirect('/onboarding');
    }

    return (
        <div className="w-full h-[calc(100vh-4rem)]">
            <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Knowledge Graph</h1>
                <div className="text-sm text-slate-500 dark:text-gray-400">
                    Click a node to explore connections • Double-click to open document
                </div>
            </header>

            <main className="h-[calc(100%-3.5rem)]">
                <Suspense fallback={<GraphSkeleton />}>
                    <NeuralGraph
                        workspaceId={profile.default_workspace_id}
                        maxInitialNodes={1000}
                    />
                </Suspense>
            </main>
        </div>
    );
}
