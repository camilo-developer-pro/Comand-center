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

// ============================================
// SUPER ADMIN TYPES
// Added post-Phase 5
// ============================================

// System role type
export type SystemRole = 'user' | 'super_admin';

// Extended profile with system role
export interface ProfileWithSystemRole {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    default_workspace_id: string | null;
    system_role: SystemRole;
    created_at: string;
    updated_at: string;
}

// Super admin status check result
export interface SuperAdminStatus {
    isSuperAdmin: boolean;
    email: string | null;
}

// Audit log entry
export interface AuditLogEntry {
    id: string;
    admin_user_id: string;
    action: string;
    target_table: string | null;
    target_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
}
