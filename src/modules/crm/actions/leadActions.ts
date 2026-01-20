'use server';

/**
 * CRM Lead Server Actions
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Server Actions for CRUD operations on CRM leads.
 * All actions enforce authentication and workspace membership.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
    Lead,
    LeadInsert,
    LeadUpdate,
    LeadFilters,
    LeadQueryOptions,
    LeadActionResult,
    LeadsQueryResult,
    LeadStatus,
} from '../types';

// ============================================================
// Authentication Helper
// ============================================================

interface AuthContext {
    userId: string;
    workspaceId: string;
}

async function requireAuth(): Promise<AuthContext> {
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
// Query Actions
// ============================================================

/**
 * Get leads with optional filtering and pagination
 */
export async function getLeads(
    options: LeadQueryOptions = {}
): Promise<LeadsQueryResult> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const {
            filters = {},
            orderBy = 'created_at',
            orderDirection = 'desc',
            limit = 50,
            offset = 0,
        } = options;

        // Build query
        let query = supabase
            .from('crm_leads')
            .select('*', { count: 'exact' })
            .eq('workspace_id', workspaceId);

        // Apply filters
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query = query.in('status', filters.status);
            } else {
                query = query.eq('status', filters.status);
            }
        }

        if (filters.minValue !== undefined) {
            query = query.gte('value', filters.minValue);
        }

        if (filters.maxValue !== undefined) {
            query = query.lte('value', filters.maxValue);
        }

        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
        }

        // Apply ordering and pagination
        query = query
            .order(orderBy, { ascending: orderDirection === 'asc' })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('[leadActions] getLeads error:', error);

            // Check for RLS violation (returns empty, not error)
            if (error.code === 'PGRST116') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }

            return { success: false, error: error.message };
        }

        return {
            success: true,
            data: (data as Lead[]) || [],
            count: count || 0,
        };
    } catch (error) {
        console.error('[leadActions] getLeads unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in to view leads', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'You do not have access to this workspace', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch leads', code: 'UNKNOWN' };
    }
}

/**
 * Get a single lead by ID
 */
export async function getLead(leadId: string): Promise<LeadActionResult> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('id', leadId)
            .eq('workspace_id', workspaceId)
            .single();

        if (error) {
            console.error('[leadActions] getLead error:', error);

            if (error.code === 'PGRST116') {
                return { success: false, error: 'Lead not found', code: 'NOT_FOUND' };
            }

            return { success: false, error: error.message };
        }

        return { success: true, data: data as Lead };
    } catch (error) {
        console.error('[leadActions] getLead unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to fetch lead', code: 'UNKNOWN' };
    }
}

// ============================================================
// Mutation Actions
// ============================================================

/**
 * Create a new lead
 */
export async function createLead(input: LeadInsert): Promise<LeadActionResult> {
    try {
        const { userId, workspaceId } = await requireAuth();
        const supabase = await createClient();

        // Validate required fields
        if (!input.name?.trim()) {
            return { success: false, error: 'Name is required', code: 'VALIDATION_ERROR' };
        }
        if (!input.email?.trim()) {
            return { success: false, error: 'Email is required', code: 'VALIDATION_ERROR' };
        }

        const { data, error } = await supabase
            .from('crm_leads')
            .insert({
                name: input.name.trim(),
                email: input.email.trim().toLowerCase(),
                company: input.company?.trim() || null,
                status: input.status || 'new',
                value: input.value || 0,
                notes: input.notes?.trim() || null,
                workspace_id: workspaceId,
                created_by: userId,
            })
            .select()
            .single();

        if (error) {
            console.error('[leadActions] createLead error:', error);
            return { success: false, error: error.message };
        }

        // Revalidate the leads list
        revalidatePath('/documents');

        return { success: true, data: data as Lead };
    } catch (error) {
        console.error('[leadActions] createLead unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to create lead', code: 'UNKNOWN' };
    }
}

/**
 * Update a lead
 */
export async function updateLead(
    leadId: string,
    updates: LeadUpdate
): Promise<LeadActionResult> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        // Build update object, only including provided fields
        const updateData: Record<string, unknown> = {};

        if (updates.name !== undefined) {
            updateData.name = updates.name.trim();
        }
        if (updates.email !== undefined) {
            updateData.email = updates.email.trim().toLowerCase();
        }
        if (updates.company !== undefined) {
            updateData.company = updates.company?.trim() || null;
        }
        if (updates.status !== undefined) {
            updateData.status = updates.status;
        }
        if (updates.value !== undefined) {
            updateData.value = updates.value;
        }
        if (updates.notes !== undefined) {
            updateData.notes = updates.notes?.trim() || null;
        }

        if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No fields to update', code: 'VALIDATION_ERROR' };
        }

        const { data, error } = await supabase
            .from('crm_leads')
            .update(updateData)
            .eq('id', leadId)
            .eq('workspace_id', workspaceId)
            .select()
            .single();

        if (error) {
            console.error('[leadActions] updateLead error:', error);

            if (error.code === 'PGRST116') {
                return { success: false, error: 'Lead not found', code: 'NOT_FOUND' };
            }

            return { success: false, error: error.message };
        }

        // Revalidate
        revalidatePath('/documents');

        return { success: true, data: data as Lead };
    } catch (error) {
        console.error('[leadActions] updateLead unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to update lead', code: 'UNKNOWN' };
    }
}

/**
 * Update only the status of a lead (optimized for quick status changes)
 */
export async function updateLeadStatus(
    leadId: string,
    status: LeadStatus
): Promise<LeadActionResult> {
    return updateLead(leadId, { status });
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<LeadActionResult<{ deleted: boolean }>> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { error } = await supabase
            .from('crm_leads')
            .delete()
            .eq('id', leadId)
            .eq('workspace_id', workspaceId);

        if (error) {
            console.error('[leadActions] deleteLead error:', error);
            return { success: false, error: error.message };
        }

        // Revalidate
        revalidatePath('/documents');

        return { success: true, data: { deleted: true } };
    } catch (error) {
        console.error('[leadActions] deleteLead unexpected error:', error);

        if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
                return { success: false, error: 'Please sign in', code: 'UNAUTHORIZED' };
            }
            if (error.message === 'FORBIDDEN') {
                return { success: false, error: 'Access denied', code: 'FORBIDDEN' };
            }
        }

        return { success: false, error: 'Failed to delete lead', code: 'UNKNOWN' };
    }
}

// ============================================================
// Utility Actions
// ============================================================

/**
 * Seed sample leads for a new workspace (for demo purposes)
 */
export async function seedSampleLeads(): Promise<LeadActionResult<{ seeded: boolean }>> {
    try {
        const { userId, workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { error } = await supabase.rpc('seed_sample_leads', {
            p_workspace_id: workspaceId,
            p_user_id: userId,
        });

        if (error) {
            console.error('[leadActions] seedSampleLeads error:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/documents');

        return { success: true, data: { seeded: true } };
    } catch (error) {
        console.error('[leadActions] seedSampleLeads unexpected error:', error);
        return { success: false, error: 'Failed to seed sample leads', code: 'UNKNOWN' };
    }
}

/**
 * Get lead statistics for dashboard
 */
export async function getLeadStats(): Promise<LeadActionResult<{
    total: number;
    byStatus: Record<LeadStatus, number>;
    totalValue: number;
    averageValue: number;
}>> {
    try {
        const { workspaceId } = await requireAuth();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('crm_leads')
            .select('status, value')
            .eq('workspace_id', workspaceId);

        if (error) {
            console.error('[leadActions] getLeadStats error:', error);
            return { success: false, error: error.message };
        }

        const leads = data || [];
        const total = leads.length;
        const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);

        const byStatus = leads.reduce((acc, lead) => {
            const status = lead.status as LeadStatus;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<LeadStatus, number>);

        return {
            success: true,
            data: {
                total,
                byStatus,
                totalValue,
                averageValue: total > 0 ? totalValue / total : 0,
            },
        };
    } catch (error) {
        console.error('[leadActions] getLeadStats unexpected error:', error);
        return { success: false, error: 'Failed to fetch lead stats', code: 'UNKNOWN' };
    }
}
