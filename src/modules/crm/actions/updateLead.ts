// src/modules/crm/actions/updateLead.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { Lead, LeadStatusFilter } from '../types'

export type UpdateLeadResponse = {
    success: true
    data: Lead
} | {
    success: false
    error: string
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER_ERROR'
}

export async function updateLeadStatus(
    leadId: string,
    newStatus: Exclude<LeadStatusFilter, 'all'>
): Promise<UpdateLeadResponse> {
    const supabase = await createClient()

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return {
            success: false,
            error: 'You must be logged in to update leads',
            code: 'UNAUTHORIZED'
        }
    }

    // Update with RLS enforcement
    const { data: lead, error: updateError } = await supabase
        .from('crm_leads')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select()
        .single()

    if (updateError) {
        console.error('[updateLeadStatus] Update failed:', updateError.message)

        if (updateError.code === 'PGRST116') {
            return {
                success: false,
                error: 'Lead not found or you do not have permission to update it',
                code: 'NOT_FOUND'
            }
        }

        return {
            success: false,
            error: 'Failed to update lead status',
            code: 'SERVER_ERROR'
        }
    }

    return {
        success: true,
        data: lead
    }
}
