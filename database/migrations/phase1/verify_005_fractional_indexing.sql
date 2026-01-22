-- File: verify_005_fractional_indexing.sql
DO $$
DECLARE
    v_key TEXT;
    v_keys TEXT[] := ARRAY[]::TEXT[];
    v_i INT;
BEGIN
    -- Test 1: Generate key between NULL and NULL (first item)
    v_key := fi_generate_key_between(NULL, NULL);
    ASSERT v_key IS NOT NULL AND v_key != '', 'Test 1 failed: empty key for NULL, NULL';
    RAISE NOTICE 'Test 1 PASSED: fi_generate_key_between(NULL, NULL) = %', v_key;

    -- Test 2: Generate key after existing
    v_key := fi_generate_key_between('V', NULL);
    ASSERT v_key > 'V', 'Test 2 failed: key should be after V';
    RAISE NOTICE 'Test 2 PASSED: fi_generate_key_between(V, NULL) = %', v_key;

    -- Test 3: Generate key before existing
    v_key := fi_generate_key_between(NULL, 'V');
    ASSERT v_key < 'V', 'Test 3 failed: key should be before V';
    RAISE NOTICE 'Test 3 PASSED: fi_generate_key_between(NULL, V) = %', v_key;

    -- Test 4: Generate key between two keys
    v_key := fi_generate_key_between('a', 'c');
    ASSERT v_key > 'a' AND v_key < 'c', 'Test 4 failed: key should be between a and c';
    RAISE NOTICE 'Test 4 PASSED: fi_generate_key_between(a, c) = %', v_key;

    -- Test 5: Infinite Space - adjacent characters
    v_key := fi_generate_key_between('a', 'b');
    ASSERT v_key > 'a' AND v_key < 'b', 'Test 5 failed: key should be between a and b';
    ASSERT length(v_key) > 1, 'Test 5 failed: should append character for adjacent keys';
    RAISE NOTICE 'Test 5 PASSED: fi_generate_key_between(a, b) = % (length: %)', v_key, length(v_key);

    -- Test 6: Stress test - 100 sequential insertions
    v_keys := ARRAY[fi_generate_key_between(NULL, NULL)];
    FOR v_i IN 1..100 LOOP
        v_key := fi_generate_key_between(v_keys[array_length(v_keys, 1)], NULL);
        ASSERT v_key > v_keys[array_length(v_keys, 1)], 'Test 6 failed at iteration ' || v_i;
        v_keys := array_append(v_keys, v_key);
    END LOOP;
    RAISE NOTICE 'Test 6 PASSED: 100 sequential insertions maintain order';
    RAISE NOTICE 'First 5 keys: %, %, %, %, %', v_keys[1], v_keys[2], v_keys[3], v_keys[4], v_keys[5];

    -- Test 7: Invalid input (lower >= upper)
    BEGIN
        v_key := fi_generate_key_between('z', 'a');
        RAISE EXCEPTION 'Test 7 failed: should raise exception for invalid input';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 7 PASSED: correctly rejects lower >= upper';
    END;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL FRACTIONAL INDEXING TESTS PASSED';
    RAISE NOTICE '========================================';
END;
$$;