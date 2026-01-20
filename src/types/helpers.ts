import type { Database } from './database.types'

// Table row types
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type CrmLead = Database['public']['Tables']['crm_leads']['Row']
export type CrmLeadInsert = Database['public']['Tables']['crm_leads']['Insert']
export type CrmLeadUpdate = Database['public']['Tables']['crm_leads']['Update']

export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']

// Enum types
export type WorkspaceRole = Database['public']['Enums']['workspace_role']
export type LeadStatus = Database['public']['Enums']['lead_status']

// Utility type for Supabase query results
export type QueryResult<T> = {
    data: T | null
    error: Error | null
}
