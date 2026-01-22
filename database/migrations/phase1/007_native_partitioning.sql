-- File: migrations/phase1/007_native_partitioning.sql

-- ============================================================
-- NATIVE POSTGRESQL PARTITIONING FOR EPISODIC MEMORY
-- Replaces pg_partman (not available in Supabase)
-- ============================================================

-- Create partition management schema
CREATE SCHEMA IF NOT EXISTS partition_mgmt;

-- Track partition metadata
CREATE TABLE partition_mgmt.partition_config (
    id SERIAL PRIMARY KEY,
    parent_schema TEXT NOT NULL,
    parent_table TEXT NOT NULL,
    partition_column TEXT NOT NULL,
    partition_interval INTERVAL NOT NULL,
    retention_period INTERVAL,
    premake_count INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_partition_config UNIQUE (parent_schema, parent_table)
);

CREATE TABLE partition_mgmt.partition_log (
    id BIGSERIAL PRIMARY KEY,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    parent_table TEXT NOT NULL,
    partition_name TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'created', 'dropped', 'error'
    range_start TIMESTAMPTZ,
    range_end TIMESTAMPTZ,
    message TEXT
);

-- ============================================================
-- FUNCTION: Generate partition name from date
-- ============================================================
CREATE OR REPLACE FUNCTION partition_mgmt.generate_partition_name(
    p_parent_table TEXT,
    p_date DATE
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $func$
    SELECT p_parent_table || '_p' || to_char(p_date, 'YYYY_MM');
$func$;

-- ============================================================
-- FUNCTION: Create a single monthly partition
-- ============================================================
CREATE OR REPLACE FUNCTION partition_mgmt.create_monthly_partition(
    p_parent_schema TEXT,
    p_parent_table TEXT,
    p_year INT,
    p_month INT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $func$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_full_parent TEXT;
    v_full_partition TEXT;
BEGIN
    -- Calculate date range
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := v_start_date + INTERVAL '1 month';

    -- Generate names
    v_partition_name := partition_mgmt.generate_partition_name(p_parent_table, v_start_date);
    v_full_parent := format('%I.%I', p_parent_schema, p_parent_table);
    v_full_partition := format('%I.%I', p_parent_schema, v_partition_name);

    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = p_parent_schema
        AND tablename = v_partition_name
    ) THEN
        RAISE NOTICE 'Partition % already exists', v_full_partition;
        RETURN v_partition_name;
    END IF;

    -- Create the partition
    EXECUTE format(
        'CREATE TABLE %s PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
        v_full_partition,
        v_full_parent,
        v_start_date,
        v_end_date
    );

    -- Log the creation
    INSERT INTO partition_mgmt.partition_log
        (parent_table, partition_name, action, range_start, range_end, message)
    VALUES
        (v_full_parent, v_partition_name, 'created', v_start_date, v_end_date, 'Partition created successfully');

    RAISE NOTICE 'Created partition % for range % to %', v_full_partition, v_start_date, v_end_date;

    RETURN v_partition_name;
END;
$func$;

-- ============================================================
-- FUNCTION: Create partitions for a date range
-- ============================================================
CREATE OR REPLACE FUNCTION partition_mgmt.create_partitions_for_range(
    p_parent_schema TEXT,
    p_parent_table TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (partition_name TEXT, range_start DATE, range_end DATE)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_current_date DATE;
    v_partition TEXT;
BEGIN
    v_current_date := date_trunc('month', p_start_date)::DATE;

    WHILE v_current_date < p_end_date LOOP
        v_partition := partition_mgmt.create_monthly_partition(
            p_parent_schema,
            p_parent_table,
            EXTRACT(YEAR FROM v_current_date)::INT,
            EXTRACT(MONTH FROM v_current_date)::INT
        );

        partition_name := v_partition;
        range_start := v_current_date;
        range_end := (v_current_date + INTERVAL '1 month')::DATE;
        RETURN NEXT;

        v_current_date := v_current_date + INTERVAL '1 month';
    END LOOP;
END;
$func$;

-- ============================================================
-- FUNCTION: Ensure future partitions exist (maintenance)
-- ============================================================
CREATE OR REPLACE FUNCTION partition_mgmt.ensure_future_partitions(
    p_parent_schema TEXT DEFAULT NULL,
    p_parent_table TEXT DEFAULT NULL
)
RETURNS TABLE (parent_table TEXT, partition_name TEXT, action TEXT)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_config RECORD;
    v_future_date DATE;
    v_partition TEXT;
BEGIN
    -- Process all configured tables or just the specified one
    FOR v_config IN
        SELECT * FROM partition_mgmt.partition_config
        WHERE (p_parent_schema IS NULL OR parent_schema = p_parent_schema)
        AND (p_parent_table IS NULL OR partition_config.parent_table = p_parent_table)
    LOOP
        -- Create partitions from current month to premake_count months ahead
        v_future_date := date_trunc('month', CURRENT_DATE)::DATE;

        FOR i IN 0..v_config.premake_count LOOP
            v_partition := partition_mgmt.create_monthly_partition(
                v_config.parent_schema,
                v_config.parent_table,
                EXTRACT(YEAR FROM v_future_date)::INT,
                EXTRACT(MONTH FROM v_future_date)::INT
            );

            parent_table := v_config.parent_schema || '.' || v_config.parent_table;
            partition_name := v_partition;
            action := 'ensured';
            RETURN NEXT;

            v_future_date := v_future_date + INTERVAL '1 month';
        END LOOP;
    END LOOP;
END;
$func$;

-- ============================================================
-- FUNCTION: Drop old partitions (retention)
-- ============================================================
CREATE OR REPLACE FUNCTION partition_mgmt.apply_retention(
    p_parent_schema TEXT DEFAULT NULL,
    p_parent_table TEXT DEFAULT NULL
)
RETURNS TABLE (parent_table TEXT, partition_name TEXT, action TEXT, message TEXT)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_config RECORD;
    v_partition RECORD;
    v_cutoff_date DATE;
    v_partition_start DATE;
BEGIN
    FOR v_config IN
        SELECT * FROM partition_mgmt.partition_config
        WHERE retention_period IS NOT NULL
        AND (p_parent_schema IS NULL OR parent_schema = p_parent_schema)
        AND (p_parent_table IS NULL OR partition_config.parent_table = p_parent_table)
    LOOP
        v_cutoff_date := (CURRENT_DATE - v_config.retention_period)::DATE;

        -- Find partitions older than retention period
        FOR v_partition IN
            SELECT
                c.relname AS partition_name,
                pg_get_expr(c.relpartbound, c.oid) AS partition_bound
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_inherits i ON i.inhrelid = c.oid
            JOIN pg_class parent ON parent.oid = i.inhparent
            JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
            WHERE n.nspname = v_config.parent_schema
            AND parent.relname = v_config.parent_table
            AND parent_ns.nspname = v_config.parent_schema
            AND c.relkind = 'r'
        LOOP
            -- Extract start date from partition bound (format: FOR VALUES FROM ('YYYY-MM-DD') TO ('YYYY-MM-DD'))
            BEGIN
                v_partition_start := (regexp_match(v_partition.partition_bound, 'FROM \(''(\d{4}-\d{2}-\d{2})''\)'))[1]::DATE;

                IF v_partition_start < v_cutoff_date THEN
                    -- Drop the partition
                    EXECUTE format('DROP TABLE %I.%I', v_config.parent_schema, v_partition.partition_name);

                    -- Log the drop
                    INSERT INTO partition_mgmt.partition_log
                        (parent_table, partition_name, action, range_start, message)
                    VALUES
                        (v_config.parent_schema || '.' || v_config.parent_table,
                         v_partition.partition_name,
                         'dropped',
                         v_partition_start,
                         format('Dropped due to retention policy (cutoff: %s)', v_cutoff_date));

                    parent_table := v_config.parent_schema || '.' || v_config.parent_table;
                    partition_name := v_partition.partition_name;
                    action := 'dropped';
                    message := format('Partition older than %s retention', v_config.retention_period);
                    RETURN NEXT;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Skip partitions we can't parse
                CONTINUE;
            END;
        END LOOP;
    END LOOP;
END;
$func$;

-- ============================================================
-- FUNCTION: Run all maintenance (create future + apply retention)
-- ============================================================
CREATE OR REPLACE FUNCTION partition_mgmt.run_maintenance()
RETURNS TABLE (parent_table TEXT, partition_name TEXT, action TEXT, message TEXT)
LANGUAGE plpgsql
AS $func$
BEGIN
    -- Ensure future partitions
    RETURN QUERY
    SELECT
        f.parent_table,
        f.partition_name,
        f.action,
        'Future partition ensured'::TEXT AS message
    FROM partition_mgmt.ensure_future_partitions() f;

    -- Apply retention
    RETURN QUERY
    SELECT * FROM partition_mgmt.apply_retention();
END;
$func$;

COMMENT ON FUNCTION partition_mgmt.run_maintenance() IS
'Run periodic maintenance: creates future partitions and drops old ones based on retention. Schedule with external scheduler.';