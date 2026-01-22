-- File: migrations/010_entity_resolution_trigger.sql

-- Configuration for entity resolution behavior
CREATE TABLE semantic_memory.resolution_config (
    id INT PRIMARY KEY DEFAULT 1,

    -- Similarity thresholds
    auto_match_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.95,
    candidate_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.85,

    -- Behavior flags
    blocking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    strict_mode BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = reject, FALSE = flag
    check_aliases BOOLEAN NOT NULL DEFAULT TRUE,

    -- Limits
    max_candidates_to_check INT NOT NULL DEFAULT 10,

    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default configuration
INSERT INTO semantic_memory.resolution_config (id) VALUES (1);

COMMENT ON TABLE semantic_memory.resolution_config IS
'Single-row configuration for entity resolution behavior. Controls blocking thresholds and modes.';

CREATE OR REPLACE FUNCTION semantic_memory.fn_find_duplicate_candidates(
    p_entity_type TEXT,
    p_canonical_name TEXT,
    p_embedding VECTOR(1536) DEFAULT NULL,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    entity_id UUID,
    canonical_name TEXT,
    match_type TEXT,
    similarity_score NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_config semantic_memory.resolution_config;
    v_normalized_name TEXT;
BEGIN
    -- Get configuration
    SELECT * INTO v_config FROM semantic_memory.resolution_config WHERE id = 1;

    -- Normalize input name
    v_normalized_name := lower(trim(regexp_replace(p_canonical_name, '\s+', ' ', 'g')));

    -- Check for exact alias match first (fastest)
    IF v_config.check_aliases THEN
        RETURN QUERY
        SELECT DISTINCT
            e.id,
            e.canonical_name,
            'alias_exact'::TEXT,
            1.0::NUMERIC
        FROM semantic_memory.entities e
        JOIN semantic_memory.entity_aliases a ON a.entity_id = e.id
        WHERE e.entity_type = p_entity_type
        AND e.status NOT IN ('archived', 'merged')
        AND a.normalized_alias = v_normalized_name
        AND (p_exclude_id IS NULL OR e.id != p_exclude_id)
        LIMIT v_config.max_candidates_to_check;
    END IF;

    -- Check for vector similarity if embedding provided
    IF p_embedding IS NOT NULL THEN
        RETURN QUERY
        SELECT
            e.id,
            e.canonical_name,
            'vector_similarity'::TEXT,
            (1 - (e.embedding <=> p_embedding))::NUMERIC AS similarity
        FROM semantic_memory.entities e
        WHERE e.entity_type = p_entity_type
        AND e.status NOT IN ('archived', 'merged')
        AND e.embedding IS NOT NULL
        AND (p_exclude_id IS NULL OR e.id != p_exclude_id)
        AND (1 - (e.embedding <=> p_embedding)) >= v_config.candidate_threshold
        ORDER BY e.embedding <=> p_embedding
        LIMIT v_config.max_candidates_to_check;
    END IF;

    -- Fuzzy name match using trigram similarity (commented out due to pg_trgm limitations)
    -- RETURN QUERY
    -- SELECT
    --     e.id,
    --     e.canonical_name,
    --     'name_fuzzy'::TEXT,
    --     similarity(lower(e.canonical_name), v_normalized_name)::NUMERIC
    -- FROM semantic_memory.entities e
    -- WHERE e.entity_type = p_entity_type
    -- AND e.status NOT IN ('archived', 'merged')
    -- AND (p_exclude_id IS NULL OR e.id != p_exclude_id)
    -- AND similarity(lower(e.canonical_name), v_normalized_name) >= v_config.candidate_threshold
    -- ORDER BY similarity(lower(e.canonical_name), v_normalized_name) DESC
    -- LIMIT v_config.max_candidates_to_check;
END;
$$;

COMMENT ON FUNCTION semantic_memory.fn_find_duplicate_candidates IS
'Finds potential duplicate entities using alias matching and vector similarity.';

CREATE OR REPLACE FUNCTION semantic_memory.fn_entity_resolution_blocking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_config semantic_memory.resolution_config;
    v_candidate RECORD;
    v_has_high_confidence_match BOOLEAN := FALSE;
    v_match_id UUID;
    v_match_name TEXT;
    v_match_score NUMERIC;
BEGIN
    -- Get configuration
    SELECT * INTO v_config FROM semantic_memory.resolution_config WHERE id = 1;

    -- Skip if blocking disabled
    IF NOT v_config.blocking_enabled THEN
        RETURN NEW;
    END IF;

    -- Skip if entity is already marked as merged
    IF NEW.status = 'merged' THEN
        RETURN NEW;
    END IF;

    -- Find duplicate candidates
    FOR v_candidate IN
        SELECT * FROM semantic_memory.fn_find_duplicate_candidates(
            NEW.entity_type,
            NEW.canonical_name,
            NEW.embedding,
            NEW.id  -- Exclude self on UPDATE
        )
    LOOP
        -- Check if this is a high-confidence match
        IF v_candidate.similarity_score >= v_config.auto_match_threshold THEN
            v_has_high_confidence_match := TRUE;
            v_match_id := v_candidate.entity_id;
            v_match_name := v_candidate.canonical_name;
            v_match_score := v_candidate.similarity_score;
            EXIT;  -- Stop at first high-confidence match
        END IF;
    END LOOP;

    -- Handle high-confidence match
    IF v_has_high_confidence_match THEN
        IF v_config.strict_mode THEN
            -- Strict mode: reject the insert
            RAISE EXCEPTION 'Entity resolution blocked: "%" matches existing entity "%" (ID: %, Score: %)',
                NEW.canonical_name, v_match_name, v_match_id, v_match_score
                USING HINT = 'Consider merging with existing entity or disable strict mode';
        ELSE
            -- Non-strict mode: flag for review and link
            NEW.status := 'flagged';
            NEW.merged_into_id := v_match_id;  -- Suggest merge target
            NEW.metadata := NEW.metadata || jsonb_build_object(
                '_resolution_candidate', jsonb_build_object(
                    'match_id', v_match_id,
                    'match_name', v_match_name,
                    'match_score', v_match_score,
                    'detected_at', NOW()
                )
            );

            RAISE NOTICE 'Entity flagged for review: "%" may be duplicate of "%" (Score: %)',
                NEW.canonical_name, v_match_name, v_match_score;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION semantic_memory.fn_entity_resolution_blocking() IS
'BEFORE INSERT/UPDATE trigger that checks for duplicate entities using vector similarity and alias matching. Behavior controlled by resolution_config table.';

CREATE TRIGGER trg_entity_resolution_blocking
    BEFORE INSERT OR UPDATE OF canonical_name, embedding, entity_type
    ON semantic_memory.entities
    FOR EACH ROW
    EXECUTE FUNCTION semantic_memory.fn_entity_resolution_blocking();

CREATE OR REPLACE FUNCTION semantic_memory.fn_create_primary_alias()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create primary alias from canonical name
    INSERT INTO semantic_memory.entity_aliases (
        entity_id, alias, alias_type, is_primary
    ) VALUES (
        NEW.id, NEW.canonical_name, 'name', TRUE
    )
    ON CONFLICT (entity_id, normalized_alias) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_primary_alias
    AFTER INSERT ON semantic_memory.entities
    FOR EACH ROW
    EXECUTE FUNCTION semantic_memory.fn_create_primary_alias();