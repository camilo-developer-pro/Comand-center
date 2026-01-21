'use server';

/**
 * System Statistics Server Actions
 * 
 * Fetches system-wide statistics for the admin dashboard.
 */

import { createClient } from '@/lib/supabase/server';

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

interface SystemStats {
    activeToday: number;
    documentsCreatedToday: number;
    newUsersThisWeek: number;
}

export async function getSystemStats(): Promise<ActionResult<SystemStats>> {
    try {
        const supabase = await createClient();

        // Verify super admin
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');

        if (!isSuperAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        // Get documents created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: docsToday } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // For now, return placeholder data for active users
        // (would need a sessions/activity table for real tracking)

        return {
            success: true,
            data: {
                activeToday: docsToday || 0, // Using docs as proxy for activity
                documentsCreatedToday: docsToday || 0,
                newUsersThisWeek: 0, // Placeholder
            },
        };
    } catch (error) {
        console.error('[systemStatsActions] error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
