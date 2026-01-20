'use server';

/**
 * Workspace Server Actions
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Actions for workspace management (create, update, switch).
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Workspace } from '../types';

// ============================================================
// Types
// ============================================================

type WorkspaceResult =
    | { success: true; workspace: Workspace }
    | { success: false; error: string };

// ============================================================
// Workspace Actions
// ============================================================

/**
 * Create a new workspace for the current user
 */
export async function createWorkspace(
    name: string
): Promise<WorkspaceResult> {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'You must be signed in to create a workspace' };
        }

        // Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        // Create workspace
        const { data: workspace, error: workspaceError } = await supabase
            .from('workspaces')
            .insert({
                name,
                slug,
                owner_id: user.id,
            })
            .select()
            .single();

        if (workspaceError) {
            console.error('[workspaceActions] createWorkspace error:', workspaceError);
            return { success: false, error: workspaceError.message };
        }

        // Add user as workspace owner
        const { error: memberError } = await supabase
            .from('workspace_members')
            .insert({
                workspace_id: workspace.id,
                user_id: user.id,
                role: 'owner',
            });

        if (memberError) {
            console.error('[workspaceActions] createWorkspace member error:', memberError);
            // Workspace was created but membership failed - log but don't fail
        }

        // Update user's profile to point to new workspace
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ default_workspace_id: workspace.id })
            .eq('id', user.id);

        if (profileError) {
            console.error('[workspaceActions] createWorkspace profile error:', profileError);
        }

        revalidatePath('/', 'layout');

        return { success: true, workspace };
    } catch (error) {
        console.error('[workspaceActions] createWorkspace unexpected error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create workspace'
        };
    }
}

/**
 * Get the current user's workspace
 */
export async function getCurrentWorkspace(): Promise<Workspace | null> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return null;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('default_workspace_id')
            .eq('id', user.id)
            .single();

        if (!profile?.default_workspace_id) {
            return null;
        }

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', profile.default_workspace_id)
            .single();

        return workspace;
    } catch (error) {
        console.error('[workspaceActions] getCurrentWorkspace error:', error);
        return null;
    }
}

/**
 * Update workspace settings
 */
export async function updateWorkspace(
    workspaceId: string,
    updates: { name?: string }
): Promise<WorkspaceResult> {
    try {
        const supabase = await createClient();

        const { data: workspace, error } = await supabase
            .from('workspaces')
            .update(updates)
            .eq('id', workspaceId)
            .select()
            .single();

        if (error) {
            console.error('[workspaceActions] updateWorkspace error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/', 'layout');

        return { success: true, workspace };
    } catch (error) {
        console.error('[workspaceActions] updateWorkspace unexpected error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update workspace'
        };
    }
}
