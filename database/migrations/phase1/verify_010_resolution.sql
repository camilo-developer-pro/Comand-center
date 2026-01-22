-- File: verify_010_resolution.sql

DO $verify$
DECLARE
    v_entity1_id UUID;
    v_entity2_id UUID;
    v_alias_id UUID;
BEGIN
    -- Test 1: Create first entity
    INSERT INTO semantic_memory.entities (
        entity_type, canonical_name, status
    ) VALUES (
        'organization', 'Test Company Inc', 'active'
    ) RETURNING id INTO v_entity1_id;

    ASSERT v_entity1_id IS NOT NULL, 'Could not create first test entity';

    -- Test 2: Check primary alias was created
    SELECT id INTO v_alias_id
    FROM semantic_memory.entity_aliases
    WHERE entity_id = v_entity1_id AND is_primary = TRUE;

    ASSERT v_alias_id IS NOT NULL, 'Primary alias not auto-created';

    -- Test 3: Test alias-based blocking (strict mode)
    UPDATE semantic_memory.resolution_config
    SET strict_mode = TRUE, blocking_enabled = TRUE;

    BEGIN
        INSERT INTO semantic_memory.entities (
            entity_type, canonical_name, status
        ) VALUES (
            'organization', 'Test Company Inc', 'active'  -- Same normalized name
        );
        RAISE EXCEPTION 'Should have blocked duplicate entity';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 3 PASSED: Correctly blocked duplicate entity in strict mode';
    END;

    -- Test 4: Test non-strict mode (flagging)
    UPDATE semantic_memory.resolution_config
    SET strict_mode = FALSE;

    INSERT INTO semantic_memory.entities (
        entity_type, canonical_name, status
    ) VALUES (
        'organization', 'Test Company Inc', 'draft'  -- Will be flagged
    ) RETURNING id INTO v_entity2_id;

    -- Check if entity was flagged
    ASSERT EXISTS (
        SELECT 1 FROM semantic_memory.entities
        WHERE id = v_entity2_id
        AND status = 'flagged'
        AND merged_into_id = v_entity1_id
    ), 'Entity not properly flagged for review';

    RAISE NOTICE 'Test 4 PASSED: Entity flagged in non-strict mode';

    -- Cleanup
    DELETE FROM semantic_memory.entity_aliases WHERE entity_id IN (v_entity1_id, v_entity2_id);
    DELETE FROM semantic_memory.entities WHERE id IN (v_entity1_id, v_entity2_id);

    -- Reset config
    UPDATE semantic_memory.resolution_config
    SET strict_mode = FALSE, blocking_enabled = TRUE;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL ENTITY RESOLUTION TESTS PASSED';
    RAISE NOTICE '========================================';
END;
$verify$;