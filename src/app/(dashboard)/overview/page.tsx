/**
 * Dashboard Overview Page
 * 
 * V2.0: Server Component shell that renders the Dashboard Stats client component
 * Uses materialized view for high-performance KPI display
 */

import { DashboardStatsGrid } from '@/modules/core/dashboard';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function OverviewPage() {
    const supabase = await createClient();

    // Get current user's default workspace
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.default_workspace_id) {
        // If no default workspace, try to get the first workspace they're a member of
        const { data: membership } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership) {
            redirect('/onboarding');
        }

        // Use first workspace
        const workspaceId = membership.workspace_id;

        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                </div>

                <DashboardStatsGrid workspaceId={workspaceId} />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            <DashboardStatsGrid workspaceId={profile.default_workspace_id} />
        </div>
    );
}
