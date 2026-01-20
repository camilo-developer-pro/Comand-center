// src/modules/crm/actions/getLeads.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { GetLeadsResponse, LeadStatusFilter } from '../types'

export async function getLeads(
    workspaceId: string,
    filterStatus: LeadStatusFilter = 'all',
    limit: number = 50
): Promise<GetLeadsResponse> {
    // Step 1: Create RLS-aware Supabase client
    const supabase = await createClient()

    // Step 2: Validate user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('[getLeads] Authentication failed:', authError?.message)
        return {
            success: false,
            error: 'You must be logged in to view leads',
            code: 'UNAUTHORIZED'
        }
    }

    // Step 3: Validate workspace membership
    const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()

    if (membershipError || !membership) {
        console.error('[getLeads] Workspace access denied:', membershipError?.message)
        return {
            success: false,
            error: 'You do not have access to this workspace',
            code: 'FORBIDDEN'
        }
    }

    // Step 4: Build the query with optional status filter
    let query = supabase
        .from('crm_leads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit)

    // Apply status filter if not 'all'
    if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
    }

    // Step 5: Execute query (RLS will also apply)
    const { data: leads, error: queryError } = await query

    if (queryError) {
        console.error('[getLeads] Query failed:', queryError.message, queryError.code)

        // Check for RLS policy violation (403-equivalent)
        if (queryError.code === 'PGRST301' || queryError.message.includes('permission')) {
            return {
                success: false,
                error: 'You do not have permission to view leads in this workspace',
                code: 'FORBIDDEN'
            }
        }

        return {
            success: false,
            error: 'Failed to fetch leads',
            code: 'SERVER_ERROR'
        }
    }

    return {
        success: true,
        data: leads ?? []
    }
}
