/**
 * CRM Module - Public API
 * 
 * V1.1 Phase 2: Live Widget Data
 */

// Types
export type {
    Lead,
    LeadStatus,
    LeadInsert,
    LeadUpdate,
    LeadFilters,
    LeadQueryOptions,
    LeadListWidgetConfig,
    LeadActionResult,
    LeadsQueryResult,
} from './types';

export {
    LEAD_STATUS_CONFIG,
    LEAD_STATUS_ORDER,
} from './types';

// Components
export { LeadListWidget } from './components';

// Hooks
export {
    leadKeys,
    useLeads,
    useLead,
    useLeadStats,
    useCreateLead,
    useUpdateLead,
    useUpdateLeadStatus,
    useDeleteLead,
    useSeedSampleLeads,
    useRefreshLeads,
} from './hooks';

// Actions
export {
    getLeads,
    getLead,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    seedSampleLeads,
    getLeadStats,
} from './actions';
