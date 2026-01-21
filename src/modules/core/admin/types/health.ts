/**
 * System Health Monitor Types
 */

// Table statistics
export interface TableStats {
    table_name: string;
    row_count: number;
    total_size: string;
    index_size: string;
    toast_size: string;
    table_size: string;
}

// Connection statistics
export interface ConnectionStats {
    total_connections: number;
    active_connections: number;
    idle_connections: number;
    max_connections: number;
    connection_percentage: number;
}

// Index statistics
export interface IndexStats {
    table_name: string;
    index_name: string;
    index_size: string;
    index_scans: number;
    rows_read: number;
    rows_fetched: number;
    usage_status: 'UNUSED' | 'LOW_USAGE' | 'ACTIVE';
}

// Health summary metric
export interface HealthMetric {
    metric_name: string;
    metric_value: string;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INFO' | 'UNKNOWN';
}

// API response statistics
export interface ApiResponseStats {
    endpoint: string;
    total_requests: number;
    avg_response_ms: number;
    min_response_ms: number;
    max_response_ms: number;
    p95_response_ms: number;
    error_rate: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

// API response log entry
export interface ApiResponseLog {
    id: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    error_message: string | null;
    created_at: string;
}

// Complete health dashboard data
export interface HealthDashboardData {
    summary: HealthMetric[];
    tables: TableStats[];
    connections: ConnectionStats;
    indexes: IndexStats[];
    apiStats: ApiResponseStats[];
    slowRequests: ApiResponseLog[];
    lastUpdated: string;
}

// Health status type
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INFO' | 'UNKNOWN';
