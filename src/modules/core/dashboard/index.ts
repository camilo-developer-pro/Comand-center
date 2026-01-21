/**
 * Dashboard Module Exports
 * 
 * V1.1 Phase 5: Navigation & Dashboard
 * V2.0 Phase 4: Materialized View Integration
 */

// V1.1 Exports
export * from './types';
export * from './actions/dashboardActions';
export * from './components/DashboardHeader';
export * from './components/StatsGrid';
export * from './components/WidgetUsageCard';
export * from './components/RecentActivityCard';
export * from './components/QuickActionsCard';

// V2.0 Exports
export { useDashboardStats, dashboardKeys } from './hooks/useDashboardStats';
export { KPICard } from './components/KPICard';
export { DashboardStatsGrid } from './components/DashboardStatsGrid';
