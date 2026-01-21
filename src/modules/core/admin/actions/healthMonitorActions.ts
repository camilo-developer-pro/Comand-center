'use server';

/**
 * System Health Monitor Server Actions
 * 
 * Provides database statistics, API metrics, and health indicators.
 * Super admin access only.
 */

import { createClient } from '@/lib/supabase/server';
import type {
    TableStats,
    ConnectionStats,
    IndexStats,
    HealthMetric,
    ApiResponseStats,
    ApiResponseLog,
    HealthDashboardData,
} from '../types/health';

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// ============================================
// Verify Super Admin Access
// ============================================

async function verifySuperAdmin(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; authorized: boolean }> {
    const supabase = await createClient();
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
    return { supabase, authorized: isSuperAdmin === true };
}

// ============================================
// Get Table Statistics
// ============================================

export async function getTableStatistics(): Promise<ActionResult<TableStats[]>> {
    try {
        const { supabase, authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized: Super admin access required' };
        }

        const { data, error } = await supabase.rpc('get_table_statistics');

        if (error) {
            console.error('[healthMonitor] getTableStatistics error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('[healthMonitor] getTableStatistics exception:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get Connection Statistics
// ============================================

export async function getConnectionStatistics(): Promise<ActionResult<ConnectionStats>> {
    try {
        const { supabase, authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized' };
        }

        const { data, error } = await supabase.rpc('get_connection_statistics');

        if (error) {
            console.error('[healthMonitor] getConnectionStatistics error:', error);
            return { success: false, error: error.message };
        }

        // RPC returns array, get first item
        const stats = Array.isArray(data) ? data[0] : data;

        return {
            success: true,
            data: stats || {
                total_connections: 0,
                active_connections: 0,
                idle_connections: 0,
                max_connections: 100,
                connection_percentage: 0,
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get Index Statistics
// ============================================

export async function getIndexStatistics(): Promise<ActionResult<IndexStats[]>> {
    try {
        const { supabase, authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized' };
        }

        const { data, error } = await supabase.rpc('get_index_statistics');

        if (error) {
            console.error('[healthMonitor] getIndexStatistics error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get Health Summary
// ============================================

export async function getHealthSummary(): Promise<ActionResult<HealthMetric[]>> {
    try {
        const { supabase, authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized' };
        }

        const { data, error } = await supabase.rpc('get_database_health_summary');

        if (error) {
            console.error('[healthMonitor] getHealthSummary error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get API Response Statistics
// ============================================

export async function getApiResponseStats(
    timeWindowHours: number = 24
): Promise<ActionResult<ApiResponseStats[]>> {
    try {
        const { supabase, authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized' };
        }

        const { data, error } = await supabase.rpc('get_api_response_stats', {
            time_window_hours: timeWindowHours,
        });

        if (error) {
            console.error('[healthMonitor] getApiResponseStats error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get Slow API Requests
// ============================================

export async function getSlowApiRequests(
    limit: number = 50
): Promise<ActionResult<ApiResponseLog[]>> {
    try {
        const { supabase, authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized' };
        }

        const { data, error } = await supabase
            .from('api_response_logs')
            .select('id, endpoint, method, status_code, response_time_ms, error_message, created_at')
            .gt('response_time_ms', 1000)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('response_time_ms', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[healthMonitor] getSlowApiRequests error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Get Complete Health Dashboard Data
// ============================================

export async function getHealthDashboardData(): Promise<ActionResult<HealthDashboardData>> {
    try {
        const { authorized } = await verifySuperAdmin();

        if (!authorized) {
            return { success: false, error: 'Unauthorized' };
        }

        // Fetch all data in parallel
        const [
            summaryResult,
            tablesResult,
            connectionsResult,
            indexesResult,
            apiStatsResult,
            slowRequestsResult,
        ] = await Promise.all([
            getHealthSummary(),
            getTableStatistics(),
            getConnectionStatistics(),
            getIndexStatistics(),
            getApiResponseStats(24),
            getSlowApiRequests(20),
        ]);

        return {
            success: true,
            data: {
                summary: summaryResult.success ? summaryResult.data : [],
                tables: tablesResult.success ? tablesResult.data : [],
                connections: connectionsResult.success ? connectionsResult.data : {
                    total_connections: 0,
                    active_connections: 0,
                    idle_connections: 0,
                    max_connections: 100,
                    connection_percentage: 0,
                },
                indexes: indexesResult.success ? indexesResult.data : [],
                apiStats: apiStatsResult.success ? apiStatsResult.data : [],
                slowRequests: slowRequestsResult.success ? slowRequestsResult.data : [],
                lastUpdated: new Date().toISOString(),
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================
// Log API Response (for tracking)
// ============================================

export async function logApiResponse(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    errorMessage?: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Get user's workspace if available
        let workspaceId: string | null = null;
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('default_workspace_id')
                .eq('id', user.id)
                .single();
            workspaceId = profile?.default_workspace_id || null;
        }

        await supabase.rpc('log_api_response', {
            p_endpoint: endpoint,
            p_method: method,
            p_status_code: statusCode,
            p_response_time_ms: responseTimeMs,
            p_user_id: user?.id || null,
            p_workspace_id: workspaceId,
            p_error_message: errorMessage || null,
            p_metadata: metadata || {},
        });
    } catch (error) {
        // Don't throw - logging should never break the main flow
        console.error('[healthMonitor] logApiResponse error:', error);
    }
}
