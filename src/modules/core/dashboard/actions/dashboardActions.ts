'use server';

/**
 * Dashboard Server Actions
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 */

import { createClient } from '@/lib/supabase/server';
import { fetchWidgetUsageStats } from '@/modules/editor/actions/widgetQueryActions';
import type {
    DashboardStats,
    DashboardActionResult,
    ActivityItem,
    GrowthDataPoint
} from '../types';

// ============================================================
// Authentication Helper
// ============================================================

async function requireAuth(): Promise<{ userId: string; workspaceId: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('UNAUTHORIZED');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.default_workspace_id) {
        throw new Error('FORBIDDEN');
    }

    return { userId: user.id, workspaceId: profile.default_workspace_id };
}

// ============================================================
// Dashboard Actions
// ============================================================

/**
 * Get aggregated statistics for the workspace dashboard.
 */
export async function getDashboardStats(): Promise<DashboardActionResult<DashboardStats>> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        // 1. Total Documents
        const { count: totalDocuments } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('is_archived', false);

        // 2. Documents This Week
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: documentsThisWeek } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('is_archived', false)
            .gte('created_at', sevenDaysAgo.toISOString());

        // 3. Widget Statistics
        const widgetResult = await fetchWidgetUsageStats();
        const widgetBreakdown = widgetResult.success ? widgetResult.data : {};
        const totalWidgets = Object.values(widgetBreakdown).reduce((sum, count) => sum + count, 0);

        // 4. Member Count
        const { count: memberCount } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId);

        // 5. Recent Activity (Mapped from documents table for now)
        const { data: recentDocs } = await supabase
            .from('documents')
            .select('id, title, updated_at, created_at, created_by, profiles(full_name)')
            .eq('workspace_id', workspaceId)
            .order('updated_at', { ascending: false })
            .limit(10);

        const recentActivity: ActivityItem[] = (recentDocs || []).map(doc => {
            const isCreated = doc.created_at === doc.updated_at;
            // Accessing profile info from the join
            // Supabase returns it as an object or array depending on the query
            const profile = Array.isArray(doc.profiles) ? doc.profiles[0] : doc.profiles;
            const userName = profile?.full_name || 'Unknown User';

            return {
                id: `${doc.id}-${doc.updated_at}`,
                type: isCreated ? 'document_create' : 'document_edit',
                documentId: doc.id,
                documentTitle: doc.title,
                userName: userName,
                timestamp: doc.updated_at
            };
        });

        return {
            success: true,
            data: {
                totalDocuments: totalDocuments || 0,
                documentsThisWeek: documentsThisWeek || 0,
                totalWidgets,
                widgetBreakdown,
                recentActivity,
                memberCount: memberCount || 0
            }
        };
    } catch (error) {
        console.error('[dashboardActions] getDashboardStats error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
        };
    }
}

/**
 * Get document growth over the last 30 days.
 */
export async function getDocumentGrowth(): Promise<DashboardActionResult<GrowthDataPoint[]>> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('documents')
            .select('created_at')
            .eq('workspace_id', workspaceId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by day
        const growthMap: Record<string, number> = {};

        // Initialize last 30 days with 0
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            growthMap[date.toISOString().split('T')[0]] = 0;
        }

        data?.forEach(doc => {
            const date = doc.created_at.split('T')[0];
            if (growthMap[date] !== undefined) {
                growthMap[date]++;
            }
        });

        const growthData: GrowthDataPoint[] = Object.entries(growthMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return { success: true, data: growthData };
    } catch (error) {
        console.error('[dashboardActions] getDocumentGrowth error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch growth data'
        };
    }
}
