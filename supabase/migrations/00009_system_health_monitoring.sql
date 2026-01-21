-- ============================================
-- SYSTEM HEALTH MONITORING INFRASTRUCTURE
-- Provides database stats and health metrics
-- ============================================

-- ============================================
-- API Response Time Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS api_response_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    workspace_id UUID REFERENCES workspaces(id),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_response_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_response_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_response_logs(status_code);

-- RLS: Only super admins can view
ALTER TABLE api_response_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_response_logs' AND policyname = 'Super admins can view api logs'
    ) THEN
        CREATE POLICY "Super admins can view api logs" ON api_response_logs
            FOR SELECT USING (is_super_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_response_logs' AND policyname = 'System can insert api logs'
    ) THEN
        CREATE POLICY "System can insert api logs" ON api_response_logs
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- FUNCTION: Get Database Table Statistics
-- Returns row counts and sizes for all tables
-- ============================================

CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT,
    toast_size TEXT,
    table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT as table_name,
        (SELECT reltuples::BIGINT FROM pg_class WHERE relname = t.tablename) as row_count,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) as total_size,
        pg_size_pretty(pg_indexes_size(quote_ident(t.tablename)::regclass)) as index_size,
        pg_size_pretty(
            pg_total_relation_size(quote_ident(t.tablename)::regclass) - 
            pg_relation_size(quote_ident(t.tablename)::regclass) -
            pg_indexes_size(quote_ident(t.tablename)::regclass)
        ) as toast_size,
        pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::regclass)) as table_size
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(quote_ident(t.tablename)::regclass) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Database Connection Stats
-- ============================================

CREATE OR REPLACE FUNCTION get_connection_statistics()
RETURNS TABLE (
    total_connections INTEGER,
    active_connections INTEGER,
    idle_connections INTEGER,
    max_connections INTEGER,
    connection_percentage NUMERIC
) AS $$
DECLARE
    max_conn INTEGER;
BEGIN
    SELECT setting::INTEGER INTO max_conn FROM pg_settings WHERE name = 'max_connections';
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_connections,
        COUNT(*) FILTER (WHERE state = 'active')::INTEGER as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::INTEGER as idle_connections,
        max_conn as max_connections,
        ROUND((COUNT(*)::NUMERIC / max_conn::NUMERIC) * 100, 2) as connection_percentage
    FROM pg_stat_activity
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Index Usage Statistics
-- Identifies unused or underused indexes
-- ============================================

CREATE OR REPLACE FUNCTION get_index_statistics()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT,
    rows_read BIGINT,
    rows_fetched BIGINT,
    usage_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || relname as table_name,
        indexrelname::TEXT as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans,
        idx_tup_read as rows_read,
        idx_tup_fetch as rows_fetched,
        CASE 
            WHEN idx_scan = 0 THEN 'UNUSED'
            WHEN idx_scan < 100 THEN 'LOW_USAGE'
            ELSE 'ACTIVE'
        END as usage_status
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Database Health Summary
-- ============================================

CREATE OR REPLACE FUNCTION get_database_health_summary()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT,
    status TEXT
) AS $$
DECLARE
    db_size TEXT;
    conn_count INTEGER;
    max_conn INTEGER;
    cache_hit_ratio NUMERIC;
BEGIN
    -- Database size
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
    
    -- Connection count
    SELECT COUNT(*)::INTEGER INTO conn_count FROM pg_stat_activity WHERE datname = current_database();
    SELECT setting::INTEGER INTO max_conn FROM pg_settings WHERE name = 'max_connections';
    
    -- Cache hit ratio
    SELECT 
        ROUND(
            (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100, 
            2
        ) INTO cache_hit_ratio
    FROM pg_statio_user_tables;
    
    RETURN QUERY VALUES
        ('database_size', db_size, 'INFO'),
        ('connections', conn_count || '/' || max_conn, 
            CASE 
                WHEN (conn_count::NUMERIC / max_conn::NUMERIC) > 0.8 THEN 'WARNING'
                WHEN (conn_count::NUMERIC / max_conn::NUMERIC) > 0.95 THEN 'CRITICAL'
                ELSE 'HEALTHY'
            END
        ),
        ('cache_hit_ratio', COALESCE(cache_hit_ratio::TEXT, 'N/A') || '%',
            CASE 
                WHEN cache_hit_ratio IS NULL THEN 'UNKNOWN'
                WHEN cache_hit_ratio < 90 THEN 'WARNING'
                WHEN cache_hit_ratio < 80 THEN 'CRITICAL'
                ELSE 'HEALTHY'
            END
        ),
        ('rls_enabled', 'true', 'HEALTHY');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get API Response Statistics
-- Aggregated stats from api_response_logs
-- ============================================

CREATE OR REPLACE FUNCTION get_api_response_stats(
    time_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    endpoint TEXT,
    total_requests BIGINT,
    avg_response_ms NUMERIC,
    min_response_ms INTEGER,
    max_response_ms INTEGER,
    p95_response_ms NUMERIC,
    error_rate NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.endpoint,
        COUNT(*)::BIGINT as total_requests,
        ROUND(AVG(l.response_time_ms), 2) as avg_response_ms,
        MIN(l.response_time_ms) as min_response_ms,
        MAX(l.response_time_ms) as max_response_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY l.response_time_ms)::NUMERIC, 2) as p95_response_ms,
        ROUND(
            (COUNT(*) FILTER (WHERE l.status_code >= 400)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
            2
        ) as error_rate,
        CASE 
            WHEN AVG(l.response_time_ms) > 2000 THEN 'CRITICAL'
            WHEN AVG(l.response_time_ms) > 1000 THEN 'WARNING'
            ELSE 'HEALTHY'
        END as status
    FROM api_response_logs l
    WHERE l.created_at > NOW() - (time_window_hours || ' hours')::INTERVAL
    GROUP BY l.endpoint
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Log API Response
-- Called from server actions to track performance
-- ============================================

CREATE OR REPLACE FUNCTION log_api_response(
    p_endpoint TEXT,
    p_method TEXT,
    p_status_code INTEGER,
    p_response_time_ms INTEGER,
    p_user_id UUID DEFAULT NULL,
    p_workspace_id UUID DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO api_response_logs (
        endpoint,
        method,
        status_code,
        response_time_ms,
        user_id,
        workspace_id,
        error_message,
        metadata
    ) VALUES (
        p_endpoint,
        p_method,
        p_status_code,
        p_response_time_ms,
        p_user_id,
        p_workspace_id,
        p_error_message,
        p_metadata
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Recent Slow Queries (last 24h)
-- ============================================

CREATE OR REPLACE VIEW slow_api_requests AS
SELECT 
    id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    error_message,
    created_at
FROM api_response_logs
WHERE response_time_ms > 1000
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY response_time_ms DESC
LIMIT 100;
