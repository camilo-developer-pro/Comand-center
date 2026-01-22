-- File: migrations/013_entity_backfill_resolution.sql

CREATE TABLE migration.entity_resolution_batches (
    id SERIAL PRIMARY KEY,
    batch_number INT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    entities_processed INT DEFAULT 0,
    duplicates_found INT DEFAULT 0,
    merges_performed INT DEFAULT 0,

    status TEXT DEFAULT 'pending',
    error_message TEXT
);

CREATE TABLE migration.entity_resolution_matches (
    id BIGSERIAL PRIMARY KEY,
    batch_id INT REFERENCES migration.entity_resolution_batches(id),

    golden_record_id UUID NOT NULL,
    duplicate_id UUID NOT NULL,

    match_type TEXT NOT NULL,  -- 'vector', 'alias', 'fuzzy'
    similarity_score NUMERIC(5,4) NOT NULL,

    merged_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT uq_resolution_match UNIQUE (golden_record_id, duplicate_id)
);

CREATE INDEX idx_resolution_matches_golden ON migration.entity_resolution_matches (golden_record_id);
CREATE INDEX idx_resolution_matches_duplicate ON migration.entity_resolution_matches (duplicate_id);

CREATE OR REPLACE FUNCTION migration.fn_find_entity_cluster(
    p_entity_id UUID,
    p_similarity_threshold NUMERIC DEFAULT 0.90
)
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_entity semantic_memory.entities;
    v_cluster UUID[] := ARRAY[p_entity_id];
    v_candidates UUID[];
    v_candidate UUID;
    v_checked UUID[] := ARRAY[]::UUID[];
    v_to_check UUID[];
BEGIN
    -- Get the seed entity
    SELECT * INTO v_entity FROM semantic_memory.entities WHERE id = p_entity_id;

    IF v_entity IS NULL THEN
        RETURN v_cluster;
    END IF;

    -- Find initial candidates
    SELECT ARRAY_AGG(entity_id) INTO v_candidates
    FROM semantic_memory.fn_find_duplicate_candidates(
        v_entity.entity_type,
        v_entity.canonical_name,
        v_entity.embedding,
        p_entity_id
    )
    WHERE similarity_score >= p_similarity_threshold;

    IF v_candidates IS NULL THEN
        RETURN v_cluster;
    END IF;

    -- Add to cluster
    v_cluster := v_cluster || v_candidates;
    v_checked := array_append(v_checked, p_entity_id);
    v_to_check := v_candidates;

    -- Expand cluster transitively (limit depth to prevent runaway)
    FOR i IN 1..3 LOOP  -- Max 3 levels of transitivity
        EXIT WHEN array_length(v_to_check, 1) IS NULL;

        FOREACH v_candidate IN ARRAY v_to_check LOOP
            IF v_candidate = ANY(v_checked) THEN
                CONTINUE;
            END IF;

            v_checked := array_append(v_checked, v_candidate);

            SELECT * INTO v_entity FROM semantic_memory.entities WHERE id = v_candidate;

            SELECT ARRAY_AGG(entity_id) INTO v_candidates
            FROM semantic_memory.fn_find_duplicate_candidates(
                v_entity.entity_type,
                v_entity.canonical_name,
                v_entity.embedding,
                v_candidate
            )
            WHERE similarity_score >= p_similarity_threshold
            AND entity_id != ALL(v_cluster);

            IF v_candidates IS NOT NULL THEN
                v_cluster := v_cluster || v_candidates;
            END IF;
        END LOOP;

        v_to_check := ARRAY(SELECT unnest(v_cluster) EXCEPT SELECT unnest(v_checked));
    END LOOP;

    RETURN ARRAY(SELECT DISTINCT unnest(v_cluster));
END;
$$;

CREATE OR REPLACE FUNCTION migration.fn_select_golden_record(p_entity_ids UUID[])
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT id
    FROM semantic_memory.entities
    WHERE id = ANY(p_entity_ids)
    AND status NOT IN ('merged', 'archived')
    ORDER BY
        confidence_score DESC NULLS LAST,
        created_at ASC,
        id ASC
    LIMIT 1;
$$;

COMMENT ON FUNCTION migration.fn_select_golden_record IS
'Selects the Golden Record from a cluster. Highest confidence wins, ties broken by oldest entity.';

CREATE OR REPLACE FUNCTION migration.fn_merge_entity_into_golden(
    p_duplicate_id UUID,
    p_golden_id UUID,
    p_batch_id INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Transfer aliases to golden record
    INSERT INTO semantic_memory.entity_aliases (
        entity_id, alias, alias_type, language_code, is_primary, source, created_at
    )
    SELECT
        p_golden_id, alias, alias_type, language_code, FALSE, 'merge:' || p_duplicate_id::TEXT, NOW()
    FROM semantic_memory.entity_aliases
    WHERE entity_id = p_duplicate_id
    ON CONFLICT (entity_id, normalized_alias) DO NOTHING;

    -- Transfer properties to golden record (if not exists)
    INSERT INTO semantic_memory.entity_properties (
        entity_id, property_name, property_value, source, confidence, valid_from, created_at
    )
    SELECT
        p_golden_id, property_name, property_value, 'merge:' || p_duplicate_id::TEXT, confidence, valid_from, NOW()
    FROM semantic_memory.entity_properties
    WHERE entity_id = p_duplicate_id
    ON CONFLICT (entity_id, property_name, valid_from) DO NOTHING;

    -- Redirect relationships (duplicate as source -> golden as source)
    UPDATE semantic_memory.entity_relationships
    SET source_entity_id = p_golden_id
    WHERE source_entity_id = p_duplicate_id
    AND NOT EXISTS (
        SELECT 1 FROM semantic_memory.entity_relationships r2
        WHERE r2.source_entity_id = p_golden_id
        AND r2.target_entity_id = semantic_memory.entity_relationships.target_entity_id
        AND r2.relationship_type = semantic_memory.entity_relationships.relationship_type
    );

    -- Redirect relationships (duplicate as target -> golden as target)
    UPDATE semantic_memory.entity_relationships
    SET target_entity_id = p_golden_id
    WHERE target_entity_id = p_duplicate_id
    AND NOT EXISTS (
        SELECT 1 FROM semantic_memory.entity_relationships r2
        WHERE r2.target_entity_id = p_golden_id
        AND r2.source_entity_id = semantic_memory.entity_relationships.source_entity_id
        AND r2.relationship_type = semantic_memory.entity_relationships.relationship_type
    );

    -- Create same_as relationship
    INSERT INTO semantic_memory.entity_relationships (
        source_entity_id, target_entity_id, relationship_type, confidence, metadata
    ) VALUES (
        p_duplicate_id, p_golden_id, 'same_as', 1.0,
        jsonb_build_object('merge_batch', p_batch_id, 'merged_at', NOW())
    )
    ON CONFLICT DO NOTHING;

    -- Mark duplicate as merged
    UPDATE semantic_memory.entities
    SET status = 'merged',
        merged_into_id = p_golden_id,
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            '_merged_at', NOW(),
            '_merge_batch', p_batch_id
        )
    WHERE id = p_duplicate_id;
END;
$$;

CREATE OR REPLACE PROCEDURE migration.pr_resolve_entities_batch(
    p_entity_type TEXT DEFAULT NULL,
    p_batch_size INT DEFAULT 1000,
    p_similarity_threshold NUMERIC DEFAULT 0.90
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch_id INT;
    v_entity RECORD;
    v_cluster UUID[];
    v_golden_id UUID;
    v_duplicate_id UUID;
    v_processed INT := 0;
    v_duplicates INT := 0;
    v_merges INT := 0;
    v_processed_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Create batch record
    INSERT INTO migration.entity_resolution_batches (batch_number, status)
    VALUES (
        COALESCE((SELECT MAX(batch_number) + 1 FROM migration.entity_resolution_batches), 1),
        'running'
    )
    RETURNING id INTO v_batch_id;

    -- Process entities
    FOR v_entity IN
        SELECT id, entity_type, canonical_name
        FROM semantic_memory.entities
        WHERE status NOT IN ('merged', 'archived')
        AND (p_entity_type IS NULL OR entity_type = p_entity_type)
        ORDER BY created_at
        LIMIT p_batch_size
    LOOP
        -- Skip if already processed in this batch
        IF v_entity.id = ANY(v_processed_ids) THEN
            CONTINUE;
        END IF;

        v_processed := v_processed + 1;

        -- Find cluster
        v_cluster := migration.fn_find_entity_cluster(v_entity.id, p_similarity_threshold);

        -- If cluster has more than one entity
        IF array_length(v_cluster, 1) > 1 THEN
            v_duplicates := v_duplicates + array_length(v_cluster, 1) - 1;

            -- Select golden record
            v_golden_id := migration.fn_select_golden_record(v_cluster);

            -- Merge all others into golden
            FOREACH v_duplicate_id IN ARRAY v_cluster LOOP
                IF v_duplicate_id != v_golden_id THEN
                    -- Record match
                    INSERT INTO migration.entity_resolution_matches (
                        batch_id, golden_record_id, duplicate_id, match_type, similarity_score
                    )
                    SELECT v_batch_id, v_golden_id, v_duplicate_id, 'vector',
                           COALESCE(similarity_score, 0.90)
                    FROM semantic_memory.fn_find_duplicate_candidates(
                        v_entity.entity_type,
                        v_entity.canonical_name,
                        NULL,
                        v_duplicate_id
                    )
                    WHERE entity_id = v_golden_id
                    LIMIT 1
                    ON CONFLICT DO NOTHING;

                    -- Perform merge
                    PERFORM migration.fn_merge_entity_into_golden(v_duplicate_id, v_golden_id, v_batch_id);
                    v_merges := v_merges + 1;
                END IF;
            END LOOP;

            -- Mark all cluster IDs as processed
            v_processed_ids := v_processed_ids || v_cluster;
        ELSE
            v_processed_ids := array_append(v_processed_ids, v_entity.id);
        END IF;

        -- Commit periodically
        IF v_processed % 100 = 0 THEN
            COMMIT;
            RAISE NOTICE 'Batch %: processed %, duplicates %, merges %',
                v_batch_id, v_processed, v_duplicates, v_merges;
        END IF;
    END LOOP;

    -- Update batch status
    UPDATE migration.entity_resolution_batches
    SET completed_at = NOW(),
        entities_processed = v_processed,
        duplicates_found = v_duplicates,
        merges_performed = v_merges,
        status = 'completed'
    WHERE id = v_batch_id;

    COMMIT;
END;
$$;

CREATE OR REPLACE PROCEDURE migration.pr_resolve_all_entities(
    p_batch_size INT DEFAULT 1000,
    p_similarity_threshold NUMERIC DEFAULT 0.90,
    p_max_batches INT DEFAULT 1000
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch_count INT := 0;
    v_remaining INT;
BEGIN
    LOOP
        -- Check remaining unprocessed
        SELECT COUNT(*) INTO v_remaining
        FROM semantic_memory.entities
        WHERE status NOT IN ('merged', 'archived');

        EXIT WHEN v_remaining = 0 OR v_batch_count >= p_max_batches;

        CALL migration.pr_resolve_entities_batch(NULL, p_batch_size, p_similarity_threshold);

        v_batch_count := v_batch_count + 1;

        RAISE NOTICE 'Completed batch %. Remaining entities: %', v_batch_count, v_remaining;
    END LOOP;

    RAISE NOTICE 'Entity resolution complete. Total batches: %', v_batch_count;
END;
$$;