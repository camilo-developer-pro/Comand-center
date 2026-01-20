/**
 * CRM Hooks - Public API
 * 
 * V1.1 Phase 2: Live Widget Data
 */

export {
    // Query keys (for custom invalidation)
    leadKeys,

    // Query hooks
    useLeads,
    useLead,
    useLeadStats,

    // Mutation hooks
    useCreateLead,
    useUpdateLead,
    useUpdateLeadStatus,
    useDeleteLead,
    useSeedSampleLeads,

    // Utility hooks
    useRefreshLeads,
} from './useLeads';
