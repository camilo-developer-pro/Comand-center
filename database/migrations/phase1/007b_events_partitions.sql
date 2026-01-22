-- File: migrations/phase1/007b_events_partitions.sql

-- ============================================================
-- SETUP PARTITIONING FOR EPISODIC_MEMORY.EVENTS
-- ============================================================

-- Register the table for partition management
INSERT INTO partition_mgmt.partition_config (
    parent_schema,
    parent_table,
    partition_column,
    partition_interval,
    retention_period,
    premake_count
) VALUES (
    'episodic_memory',
    'events',
    'created_at',
    '1 month',
    '12 months',  -- Keep 12 months of data
    3             -- Create 3 months ahead
) ON CONFLICT (parent_schema, parent_table) DO UPDATE SET
    retention_period = EXCLUDED.retention_period,
    premake_count = EXCLUDED.premake_count;

-- Create initial partitions (current month + 3 future months)
SELECT * FROM partition_mgmt.create_partitions_for_range(
    'episodic_memory',
    'events',
    date_trunc('month', CURRENT_DATE)::DATE,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '4 months')::DATE
);

-- Also create partition for previous month (in case of late-arriving data)
SELECT partition_mgmt.create_monthly_partition(
    'episodic_memory',
    'events',
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT,
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT
);

-- Verify partitions created
SELECT
    c.relname AS partition_name,
    pg_get_expr(c.relpartbound, c.oid) AS partition_range,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_inherits i ON i.inhrelid = c.oid
JOIN pg_class parent ON parent.oid = i.inhparent
WHERE n.nspname = 'episodic_memory'
AND parent.relname = 'events'
ORDER BY c.relname;