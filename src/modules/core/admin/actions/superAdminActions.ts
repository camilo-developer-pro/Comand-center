'use server';

/**
 * Super Admin Server Actions
 * 
 * Post-Phase 5 Implementation
 * 
 * These actions are ONLY accessible to the super admin.
 * All actions are logged to the audit table.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { withTracking } from '@/lib/utils/apiTracker';

// ============================================
// Types
// ============================================

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

interface WorkspaceWithStats {
    id: string;
    name: string;
    slug: string | null;  // Updated to allow null based on schema potential
    owner_id: string;
    owner_email?: string;
    member_count: number;
    document_count: number;
    created_at: string;
}

// ============================================
// Check Super Admin Status
// ============================================

export async function checkSuperAdminStatus(): Promise<ActionResult<boolean>> {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: true, data: false };
        }

        const { data, error } = await supabase.rpc('is_super_admin');

        if (error) {
            console.error('[superAdminActions] RPC error:', error);
            // Don't fail completely, just return false
            return { success: true, data: false };
        }

        return { success: true, data: data === true };
    } catch (error) {
        console.error('[superAdminActions] checkSuperAdminStatus error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get All Workspaces (Super Admin Only)
// ============================================

export const getAllWorkspaces = withTracking('getAllWorkspaces', async (): Promise<ActionResult<WorkspaceWithStats[]>> => {
    try {
        const supabase = await createClient();

        // Verify super admin
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');

        if (!isSuperAdmin) {
            return { success: false, error: 'Unauthorized: Super admin access required' };
        }

        // Fetch all workspaces with counts
        const { data: workspaces, error } = await supabase
            .from('workspaces')
            .select(`
                id,
                name,
                owner_id,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        // Get counts and slug if exists separately (Supabase limitation with aggregates)
        const workspacesWithStats: WorkspaceWithStats[] = await Promise.all(
            (workspaces || []).map(async (w: any) => { // Type assertion for flexibility
                const { count: memberCount } = await supabase
                    .from('workspace_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('workspace_id', w.id);

                const { count: docCount } = await supabase
                    .from('documents')
                    .select('*', { count: 'exact', head: true })
                    .eq('workspace_id', w.id);

                return {
                    id: w.id,
                    name: w.name,
                    slug: w.slug || null, // Handle if slug exists or not
                    owner_id: w.owner_id,
                    member_count: memberCount || 0,
                    document_count: docCount || 0,
                    created_at: w.created_at,
                };
            })
        );

        // Log action
        await logAuditAction(supabase, 'VIEW_ALL_WORKSPACES', 'workspaces', null, {
            count: workspacesWithStats.length,
        });

        return { success: true, data: workspacesWithStats };
    } catch (error) {
        console.error('[superAdminActions] getAllWorkspaces error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});

// ============================================
// Switch to Any Workspace (Super Admin Only)
// ============================================

export async function impersonateWorkspace(workspaceId: string): Promise<ActionResult<null>> {
    try {
        const supabase = await createClient();

        // Verify super admin
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');

        if (!isSuperAdmin) {
            return { success: false, error: 'Unauthorized: Super admin access required' };
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Verify workspace exists
        const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('id, name')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace) {
            return { success: false, error: 'Workspace not found' };
        }

        // Update default workspace
        const { error } = await supabase
            .from('profiles')
            .update({ default_workspace_id: workspaceId })
            .eq('id', user.id);

        if (error) {
            return { success: false, error: error.message };
        }

        // Log action
        await logAuditAction(supabase, 'IMPERSONATE_WORKSPACE', 'workspaces', workspaceId, {
            workspace_name: workspace.name,
        });

        revalidatePath('/', 'layout');

        return { success: true, data: null };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get Audit Log (Super Admin Only)
// ============================================

export async function getAuditLog(limit: number = 50): Promise<ActionResult<Array<{
    id: string;
    action: string;
    target_table: string | null;
    target_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
}>>> {
    try {
        const supabase = await createClient();

        // Verify super admin
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');

        if (!isSuperAdmin) {
            return { success: false, error: 'Unauthorized: Super admin access required' };
        }

        const { data, error } = await supabase
            .from('super_admin_audit_log')
            .select('id, action, target_table, target_id, details, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data: (data as any[]) || [] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Helper: Log Audit Action
// ============================================

async function logAuditAction(
    supabase: Awaited<ReturnType<typeof createClient>>,
    action: string,
    targetTable: string | null,
    targetId: string | null,
    details: Record<string, unknown>
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            await supabase.from('super_admin_audit_log').insert({
                admin_user_id: user.id,
                action,
                target_table: targetTable,
                target_id: targetId,
                details,
            });
        }
    } catch (error) {
        console.error('[superAdminActions] Audit log error:', error);
    }
}
