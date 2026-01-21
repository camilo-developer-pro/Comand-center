/**
 * Dashboard Module Types
 * 
 * V1.1 Phase 5: Navigation & Dashboard
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
