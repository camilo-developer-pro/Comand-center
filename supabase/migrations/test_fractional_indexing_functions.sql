-- Test cases for fractional indexing functions
-- Run these in Supabase SQL Editor after applying the migration

-- Test 1: Empty list (should return 'V')
SELECT 'Test 1 (Empty List)' as test, fi_generate_key_between(NULL, NULL) as result;

-- Test 2: Insert at start (should return something < 'V')
SELECT 'Test 2 (Start)' as test, fi_generate_key_between(NULL, 'V') as result;

-- Test 3: Insert at end (should return something > 'V')
SELECT 'Test 3 (End)' as test, fi_generate_key_between('V', NULL) as result;

-- Test 4: Between 'a' and 'c' (should return 'b')
SELECT 'Test 4 (Between a and c)' as test, fi_generate_key_between('a', 'c') as result;

-- Test 5: Between 'a' and 'b' (should return 'aV' or similar)
SELECT 'Test 5 (Between a and b)' as test, fi_generate_key_between('a', 'b') as result;

-- Verify lexicographical order
-- This confirms that the generated keys actually sort correctly
SELECT key, key < 'V' as before_v
FROM (VALUES 
    (fi_generate_key_between(NULL, 'V')),
    ('V'),
    (fi_generate_key_between('V', NULL))
) AS t(key)
ORDER BY key COLLATE "C";

-- Expected lexicographical order check:
-- Result 1: something like 'F' or 'K' ( < 'V')
-- Result 2: 'V'
-- Result 3: something like 'k' or 'p' ( > 'V' since lowercase is after uppercase in COLLATE "C")
