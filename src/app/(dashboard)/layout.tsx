/**
 * Dashboard Layout
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Protected layout for authenticated users.
 */

import { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceProvider } from '@/modules/core/hooks/useWorkspace';

export const metadata: Metadata = {
    title: 'Dashboard - Command Center',
};

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get user's workspace
    // First try default workspace from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

    let workspaceId = profile?.default_workspace_id;
    let workspaceName = 'My Workspace'; // Default fallback

    // If no default, get the first workspace they are a member of
    if (!workspaceId) {
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('workspace_id, workspaces(name)')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (membership) {
            workspaceId = membership.workspace_id;
            // @ts-ignore - Supabase join typing can be tricky
            workspaceName = membership.workspaces?.name || 'My Workspace';
        } else {
            // User has no workspace at all -> Onboarding
            redirect('/onboarding');
        }
    } else {
        // We have an ID, let's get the name
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('name')
            .eq('id', workspaceId)
            .single();

        if (workspace) {
            workspaceName = workspace.name;
        }
    }

    return (
        <WorkspaceProvider workspaceId={workspaceId} workspaceName={workspaceName}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <Header />

                {/* Main Content */}
                <div className="flex">
                    {/* Sidebar */}
                    <Sidebar />

                    {/* Main Area */}
                    <main className="flex-1 p-6">
                        {children}
                    </main>
                </div>

                {/* Notifications */}
                <Toaster position="bottom-right" richColors />
            </div>
        </WorkspaceProvider>
    );
}
