/**
 * CRM Module Types
 * 
 * V1.1 Phase 2: Live Widget Data
 * 
 * Type definitions for CRM leads and related entities.
 */

// ============================================================
// Lead Types
// ============================================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadStatusFilter = LeadStatus | 'all';

export type GetLeadsResponse = LeadsQueryResult;

export interface Lead {
    id: string;
    name: string;
    email: string;
    company: string | null;
    status: LeadStatus;
    value: number;
    notes: string | null;
    workspace_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface LeadInsert {
    name: string;
    email: string;
    company?: string | null;
    status?: LeadStatus;
    value?: number;
    notes?: string | null;
}

export interface LeadUpdate {
    name?: string;
    email?: string;
    company?: string | null;
    status?: LeadStatus;
    value?: number;
    notes?: string | null;
}

// ============================================================
// Query Types
// ============================================================

export interface LeadFilters {
    status?: LeadStatus | LeadStatus[];
    minValue?: number;
    maxValue?: number;
    search?: string;
}

export interface LeadQueryOptions {
    filters?: LeadFilters;
    orderBy?: 'created_at' | 'updated_at' | 'value' | 'name';
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

// ============================================================
// Widget Configuration Types
// ============================================================

export interface LeadListWidgetConfig {
    title?: string;
    showValue?: boolean;
    showCompany?: boolean;
    filterStatus?: LeadStatus[];
    maxItems?: number;
}

// ============================================================
// API Response Types
// ============================================================

export type LeadActionResult<T = Lead> =
    | { success: true; data: T }
    | { success: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UNKNOWN' };

export type LeadsQueryResult =
    | { success: true; data: Lead[]; count: number }
    | { success: false; error: string; code?: string };

// ============================================================
// Status Display Helpers
// ============================================================

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
    new: { label: 'New', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    contacted: { label: 'Contacted', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    qualified: { label: 'Qualified', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    proposal: { label: 'Proposal', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    negotiation: { label: 'Negotiation', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    won: { label: 'Won', color: 'text-green-700', bgColor: 'bg-green-100' },
    lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
];
