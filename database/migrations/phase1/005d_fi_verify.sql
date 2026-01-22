-- File: migrations/phase1/005d_fi_verify.sql

DO $verify$
DECLARE
    v_key TEXT;
    v_keys TEXT[] := ARRAY[]::TEXT[];
    v_i INT;
BEGIN
    -- Test 1: Generate key between NULL and NULL
    v_key := fi_generate_key_between(NULL, NULL);
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION 'Test 1 failed: empty key for NULL, NULL';
    END IF;
    RAISE NOTICE 'Test 1 PASSED: fi_generate_key_between(NULL, NULL) = %', v_key;
    
    -- Test 2: Generate key after existing
    v_key := fi_generate_key_between('V', NULL);
    IF v_key <= 'V' THEN
        RAISE EXCEPTION 'Test 2 failed: key should be after V';
    END IF;
    RAISE NOTICE 'Test 2 PASSED: fi_generate_key_between(V, NULL) = %', v_key;
    
    -- Test 3: Generate key before existing
    v_key := fi_generate_key_between(NULL, 'V');
    IF v_key >= 'V' THEN
        RAISE EXCEPTION 'Test 3 failed: key should be before V';
    END IF;
    RAISE NOTICE 'Test 3 PASSED: fi_generate_key_between(NULL, V) = %', v_key;
    
    -- Test 4: Generate key between two keys
    v_key := fi_generate_key_between('a', 'c');
    IF v_key <= 'a' OR v_key >= 'c' THEN
        RAISE EXCEPTION 'Test 4 failed: key should be between a and c';
    END IF;
    RAISE NOTICE 'Test 4 PASSED: fi_generate_key_between(a, c) = %', v_key;
    
    -- Test 5: Infinite Space - adjacent characters
    v_key := fi_generate_key_between('a', 'b');
    IF v_key <= 'a' OR v_key >= 'b' THEN
        RAISE EXCEPTION 'Test 5 failed: key should be between a and b';
    END IF;
    IF length(v_key) <= 1 THEN
        RAISE EXCEPTION 'Test 5 failed: should append character for adjacent keys';
    END IF;
    RAISE NOTICE 'Test 5 PASSED: fi_generate_key_between(a, b) = % (length: %)', v_key, length(v_key);
    
    -- Test 6: 100 sequential insertions
    v_keys := ARRAY[fi_generate_key_between(NULL, NULL)];
    FOR v_i IN 1..100 LOOP
        v_key := fi_generate_key_between(v_keys[array_length(v_keys, 1)], NULL);
        IF v_key <= v_keys[array_length(v_keys, 1)] THEN
            RAISE EXCEPTION 'Test 6 failed at iteration %', v_i;
        END IF;
        v_keys := array_append(v_keys, v_key);
    END LOOP;
    RAISE NOTICE 'Test 6 PASSED: 100 sequential insertions maintain order';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL FRACTIONAL INDEXING TESTS PASSED';
    RAISE NOTICE '========================================';
END;
$verify$;