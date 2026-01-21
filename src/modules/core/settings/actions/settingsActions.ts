'use server';

/**
 * Settings Server Actions
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * 
 * User must be workspace owner or admin to update settings.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { WorkspaceSettings, SettingsActionResult } from '../types';

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
// Settings Actions
// ============================================================

/**
 * Get workspace settings including member count.
 */
export async function getWorkspaceSettings(): Promise<SettingsActionResult<WorkspaceSettings>> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        // Fetch workspace details
        const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', workspaceId)
            .single();

        if (wsError) throw wsError;

        // Fetch member count
        const { count, error: memberError } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId);

        if (memberError) throw memberError;

        return {
            success: true,
            data: {
                id: workspace.id,
                name: workspace.name,
                description: null, // Description is not in schema yet, will use placeholder or add later if needed. For now assuming null or adding column? 
                // Wait, schema check. migrations/00001 says workspaces has (id, name, owner_id, created_at, updated_at). No description.
                created_at: workspace.created_at,
                owner_id: workspace.owner_id,
                memberCount: count || 0
            }
        };
    } catch (error) {
        console.error('[settingsActions] getWorkspaceSettings error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch settings'
        };
    }
}

/**
 * Update workspace settings.
 */
export async function updateWorkspaceSettings(
    data: { name: string; description?: string }
): Promise<SettingsActionResult<WorkspaceSettings>> {
    try {
        const { userId, workspaceId } = await requireAuth();
        const supabase = await createClient();

        // Verify permission (Owner or Admin)
        const { data: member, error: memberError } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .single();

        if (memberError || !['owner', 'admin'].includes(member?.role)) {
            return { success: false, error: 'You do not have permission to update workspace settings.' };
        }

        // Update workspace name
        const { data: workspace, error: updateError } = await supabase
            .from('workspaces')
            .update({
                name: data.name,
                updated_at: new Date().toISOString()
            })
            .eq('id', workspaceId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Revalidate layout to update header/sidebar names
        revalidatePath('/', 'layout');

        return {
            success: true,
            data: {
                id: workspace.id,
                name: workspace.name,
                description: null, // Still no column
                created_at: workspace.created_at,
                owner_id: workspace.owner_id,
                memberCount: 0 // Not needed for update return typically, or refetch
            }
        };

    } catch (error) {
        console.error('[settingsActions] updateWorkspaceSettings error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update settings'
        };
    }
}
