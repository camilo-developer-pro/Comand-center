// src/modules/crm/types/index.ts
import { Database } from '@/types/database.types'

// Extract the lead type from the database schema
export type Lead = Database['public']['Tables']['crm_leads']['Row']

// Filter options for the widget configuration
export type LeadStatusFilter = 'all' | 'new' | 'contacted' | 'qualified' | 'lost'

// Response type for the getLeads action
export type GetLeadsResponse = {
    success: true
    data: Lead[]
} | {
    success: false
    error: string
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER_ERROR'
}

// Widget configuration (stored in BlockNote JSON)
export interface LeadListWidgetConfig {
    filterStatus: LeadStatusFilter
    limit?: number
}
