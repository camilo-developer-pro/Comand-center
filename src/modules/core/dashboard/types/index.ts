/**
 * Dashboard Module Types
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * V2.0 Phase 4: Materialized View Integration
 */

export interface ActivityItem {
    id: string;
    type: 'document_edit' | 'document_create' | 'widget_add';
    documentId: string;
    documentTitle: string;
    userName: string;
    timestamp: string;
}

export interface DashboardStats {
    totalDocuments: number;
    documentsThisWeek: number;
    totalWidgets: number;
    widgetBreakdown: Record<string, number>;
    recentActivity: ActivityItem[];
    memberCount: number;
}

export interface GrowthDataPoint {
    date: string;
    count: number;
}

export type DashboardActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// ============================================================
// V2.0: Materialized View Types
// ============================================================

/**
 * Dashboard statistics from the materialized view
 * Source: dashboard_stats_mv (via get_dashboard_stats RPC)
 */
export interface DashboardStatsFromMV {
    workspaceId: string;
    workspaceName: string;
    totalPipelineValue: number;
    totalWonValue: number;
    totalLeads: number;
    newLeadsCount: number;
    wonLeadsCount: number;
    totalDocuments: number;
    activeDocumentsCount: number;
    lastRefreshedAt: string;
}

export interface DashboardStatsResponse {
    success: boolean;
    data?: DashboardStatsFromMV;
    error?: string;
    code?: 'UNAUTHORIZED' | 'NOT_FOUND' | 'SERVER_ERROR';
}

export interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    icon?: React.ReactNode;
    isLoading?: boolean;
    isStale?: boolean;
}
