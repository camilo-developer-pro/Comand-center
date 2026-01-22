-- File: migrations/011_dual_write_infrastructure.sql

CREATE SCHEMA IF NOT EXISTS migration;

CREATE TABLE migration.migration_status (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    phase TEXT NOT NULL DEFAULT 'pending',  -- pending, dual_write, backfilling, validating, completed, rolled_back
    started_at TIMESTAMP WITH TIME ZONE,
    phase_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Progress tracking
    total_rows BIGINT,
    migrated_rows BIGINT DEFAULT 0,
    failed_rows BIGINT DEFAULT 0,
    last_migrated_id TEXT,

    -- Validation
    validation_passed BOOLEAN,
    validation_errors JSONB DEFAULT '[]',

    notes TEXT
);

CREATE TABLE migration.migration_log (
    id BIGSERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level TEXT NOT NULL,  -- INFO, WARNING, ERROR
    message TEXT NOT NULL,
    details JSONB
);

COMMENT ON TABLE migration.migration_status IS 'Tracks state of dual-write migrations.';

CREATE OR REPLACE FUNCTION migration.fn_create_dual_write_trigger(
    p_source_schema TEXT,
    p_source_table TEXT,
    p_target_schema TEXT,
    p_target_table TEXT,
    p_column_mapping JSONB  -- {"source_col": "target_col", ...}
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trigger_name TEXT;
    v_function_name TEXT;
    v_select_cols TEXT;
    v_insert_cols TEXT;
    v_values_cols TEXT;
    v_col RECORD;
BEGIN
    v_trigger_name := format('trg_dual_write_%s_%s', p_source_table, p_target_table);
    v_function_name := format('migration.fn_dual_write_%s_%s', p_source_table, p_target_table);

    -- Build column lists from mapping
    v_insert_cols := '';
    v_values_cols := '';

    FOR v_col IN SELECT * FROM jsonb_each_text(p_column_mapping) LOOP
        IF v_insert_cols != '' THEN
            v_insert_cols := v_insert_cols || ', ';
            v_values_cols := v_values_cols || ', ';
        END IF;
        v_insert_cols := v_insert_cols || quote_ident(v_col.value);
        v_values_cols := v_values_cols || 'NEW.' || quote_ident(v_col.key);
    END LOOP;

    -- Create the trigger function
    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION %s()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $trigger$
        BEGIN
            INSERT INTO %I.%I (%s)
            VALUES (%s)
            ON CONFLICT DO NOTHING;
            RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't block source write
            INSERT INTO migration.migration_log (migration_name, level, message, details)
            VALUES (%L, 'ERROR', 'Dual-write failed', jsonb_build_object(
                'error', SQLERRM,
                'source_id', NEW.id::TEXT
            ));
            RETURN NEW;
        END;
        $trigger$;
    $fn$,
        v_function_name,
        p_target_schema, p_target_table, v_insert_cols, v_values_cols,
        p_source_table || '_to_' || p_target_table
    );

    -- Create the trigger
    EXECUTE format($tr$
        DROP TRIGGER IF EXISTS %I ON %I.%I;
        CREATE TRIGGER %I
            AFTER INSERT ON %I.%I
            FOR EACH ROW
            EXECUTE FUNCTION %s();
    $tr$,
        v_trigger_name, p_source_schema, p_source_table,
        v_trigger_name, p_source_schema, p_source_table,
        v_function_name
    );

    -- Log trigger creation
    INSERT INTO migration.migration_log (migration_name, level, message, details)
    VALUES (
        p_source_table || '_to_' || p_target_table,
        'INFO',
        'Dual-write trigger created',
        jsonb_build_object(
            'trigger_name', v_trigger_name,
            'function_name', v_function_name
        )
    );
END;
$$;

COMMENT ON FUNCTION migration.fn_create_dual_write_trigger IS
'Creates a trigger for dual-write migration from source to target table.';

CREATE OR REPLACE FUNCTION migration.fn_backfill_batch(
    p_migration_name TEXT,
    p_source_query TEXT,     -- Query returning rows to migrate
    p_insert_query TEXT,     -- Parameterized INSERT for target
    p_batch_size INT DEFAULT 1000,
    p_sleep_ms INT DEFAULT 100  -- Throttling between batches
)
RETURNS TABLE (
    migrated INT,
    failed INT,
    done BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_migrated INT := 0;
    v_failed INT := 0;
    v_row RECORD;
    v_batch_count INT := 0;
BEGIN
    FOR v_row IN EXECUTE p_source_query LOOP
        BEGIN
            EXECUTE p_insert_query USING v_row;
            v_migrated := v_migrated + 1;
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            INSERT INTO migration.migration_log (migration_name, level, message, details)
            VALUES (p_migration_name, 'ERROR', 'Backfill row failed', jsonb_build_object(
                'error', SQLERRM,
                'row', to_jsonb(v_row)
            ));
        END;

        v_batch_count := v_batch_count + 1;

        -- Commit and sleep after batch
        IF v_batch_count >= p_batch_size THEN
            -- Update progress
            UPDATE migration.migration_status
            SET migrated_rows = migrated_rows + v_migrated,
                failed_rows = failed_rows + v_failed,
                last_migrated_id = v_row.id::TEXT,
                phase_changed_at = NOW()
            WHERE migration_name = p_migration_name;

            -- Throttle
            PERFORM pg_sleep(p_sleep_ms / 1000.0);

            RETURN QUERY SELECT v_migrated, v_failed, FALSE;

            v_migrated := 0;
            v_failed := 0;
            v_batch_count := 0;
        END IF;
    END LOOP;

    -- Final update
    UPDATE migration.migration_status
    SET migrated_rows = migrated_rows + v_migrated,
        failed_rows = failed_rows + v_failed,
        phase_changed_at = NOW()
    WHERE migration_name = p_migration_name;

    RETURN QUERY SELECT v_migrated, v_failed, TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION migration.fn_validate_migration(
    p_migration_name TEXT,
    p_source_schema TEXT,
    p_source_table TEXT,
    p_target_schema TEXT,
    p_target_table TEXT,
    p_key_column TEXT DEFAULT 'id'
)
RETURNS TABLE (
    check_name TEXT,
    passed BOOLEAN,
    source_value BIGINT,
    target_value BIGINT,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_count BIGINT;
    v_target_count BIGINT;
    v_missing_count BIGINT;
    v_all_passed BOOLEAN := TRUE;
BEGIN
    -- Check 1: Row count comparison
    EXECUTE format('SELECT COUNT(*) FROM %I.%I', p_source_schema, p_source_table)
        INTO v_source_count;
    EXECUTE format('SELECT COUNT(*) FROM %I.%I', p_target_schema, p_target_table)
        INTO v_target_count;

    check_name := 'row_count';
    passed := v_source_count <= v_target_count;  -- Target may have more (UUIDs)
    source_value := v_source_count;
    target_value := v_target_count;
    message := CASE WHEN passed THEN 'Row counts acceptable' ELSE 'Target has fewer rows than source' END;
    RETURN NEXT;

    IF NOT passed THEN v_all_passed := FALSE; END IF;

    -- Check 2: Missing keys (if source has deterministic IDs)
    EXECUTE format($q$
        SELECT COUNT(*) FROM %I.%I s
        WHERE NOT EXISTS (
            SELECT 1 FROM %I.%I t
            WHERE t.%I::TEXT = s.%I::TEXT
        )
    $q$, p_source_schema, p_source_table,
         p_target_schema, p_target_table,
         p_key_column, p_key_column)
    INTO v_missing_count;

    check_name := 'missing_keys';
    passed := v_missing_count = 0;
    source_value := v_missing_count;
    target_value := 0;
    message := CASE WHEN passed THEN 'All source keys present in target'
               ELSE format('%s keys missing in target', v_missing_count) END;
    RETURN NEXT;

    IF NOT passed THEN v_all_passed := FALSE; END IF;

    -- Update migration status
    UPDATE migration.migration_status
    SET validation_passed = v_all_passed,
        phase = CASE WHEN v_all_passed THEN 'validated' ELSE 'validation_failed' END,
        phase_changed_at = NOW()
    WHERE migration_name = p_migration_name;

    INSERT INTO migration.migration_log (migration_name, level, message, details)
    VALUES (p_migration_name,
            CASE WHEN v_all_passed THEN 'INFO' ELSE 'WARNING' END,
            'Validation completed',
            jsonb_build_object('all_passed', v_all_passed));
END;
$$;

CREATE OR REPLACE FUNCTION migration.fn_cutover(
    p_migration_name TEXT,
    p_source_schema TEXT,
    p_source_table TEXT,
    p_target_schema TEXT,
    p_target_table TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_status migration.migration_status;
    v_trigger_name TEXT;
BEGIN
    -- Get current status
    SELECT * INTO v_status FROM migration.migration_status
    WHERE migration_name = p_migration_name;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Migration "%" not found', p_migration_name;
    END IF;

    IF NOT v_status.validation_passed THEN
        RAISE EXCEPTION 'Cannot cutover: validation not passed for "%"', p_migration_name;
    END IF;

    -- Disable dual-write trigger
    v_trigger_name := format('trg_dual_write_%s_%s', p_source_table, p_target_table);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I',
        v_trigger_name, p_source_schema, p_source_table);

    -- Rename tables
    EXECUTE format('ALTER TABLE %I.%I RENAME TO %I_legacy',
        p_source_schema, p_source_table, p_source_table);

    -- Create view with old name pointing to new table
    EXECUTE format('CREATE VIEW %I.%I AS SELECT * FROM %I.%I',
        p_source_schema, p_source_table, p_target_schema, p_target_table);

    -- Update status
    UPDATE migration.migration_status
    SET phase = 'completed',
        completed_at = NOW(),
        phase_changed_at = NOW()
    WHERE migration_name = p_migration_name;

    INSERT INTO migration.migration_log (migration_name, level, message, details)
    VALUES (p_migration_name, 'INFO', 'Cutover completed', jsonb_build_object(
        'legacy_table', format('%s.%s_legacy', p_source_schema, p_source_table),
        'active_table', format('%s.%s', p_target_schema, p_target_table)
    ));
END;
$$;