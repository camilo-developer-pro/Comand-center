-- File: migrations/005_fractional_indexing.sql

-- Character set for fractional indexing (base62, sortable)
CREATE OR REPLACE FUNCTION public.fi_charset()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $body$
    SELECT '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
$body$;

-- Get index of character in charset
CREATE OR REPLACE FUNCTION public.fi_char_index(p_char CHAR(1))
RETURNS INT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $body$
    SELECT position(p_char IN fi_charset()) - 1;
$body$;

-- Get character at index in charset
CREATE OR REPLACE FUNCTION public.fi_index_char(p_index INT)
RETURNS CHAR(1)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $body$
    SELECT substring(fi_charset() FROM (p_index + 1) FOR 1);
$body$;

-- Get midpoint character between two characters
CREATE OR REPLACE FUNCTION public.fi_midpoint_char(p_lower CHAR(1), p_upper CHAR(1))
RETURNS CHAR(1)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $body$
DECLARE
    v_lower_idx INT;
    v_upper_idx INT;
    v_mid_idx INT;
BEGIN
    v_lower_idx := fi_char_index(p_lower);
    v_upper_idx := fi_char_index(p_upper);

    -- Handle NULL/empty as boundaries
    IF p_lower IS NULL OR p_lower = '' THEN
        v_lower_idx := -1;
    END IF;
    IF p_upper IS NULL OR p_upper = '' THEN
        v_upper_idx := 62; -- One past last char
    END IF;

    v_mid_idx := (v_lower_idx + v_upper_idx) / 2;
    RETURN fi_index_char(v_mid_idx);
END;
$body$;

-- Increment a fractional index key (for generating next key after lower)
CREATE OR REPLACE FUNCTION public.fi_increment_key(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $body$
DECLARE
    v_len INT := length(p_key);
    v_i INT := v_len;
    v_char CHAR(1);
    v_index INT;
BEGIN
    -- Handle empty key
    IF p_key = '' THEN
        RETURN fi_index_char(0); -- '0'
    END IF;

    -- Start from the rightmost character
    WHILE v_i >= 1 LOOP
        v_char := substring(p_key FROM v_i FOR 1);
        v_index := fi_char_index(v_char);
        IF v_index < 61 THEN -- not 'z'
            -- Increment this character and return
            RETURN substring(p_key FROM 1 FOR v_i - 1) || fi_index_char(v_index + 1) || substring(p_key FROM v_i + 1);
        ELSE
            -- Set to '0', continue to next left character
            v_i := v_i - 1;
        END IF;
    END LOOP;

    -- All characters were 'z', prepend '0'
    RETURN '0' || p_key;
END;
$;

DROP FUNCTION IF EXISTS public.fi_generate_key_between(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.fi_generate_key_between(
    p_lower TEXT DEFAULT NULL,
    p_upper TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $body$
DECLARE
    v_lower TEXT := COALESCE(p_lower, '');
    v_upper TEXT := COALESCE(p_upper, '');
    v_result TEXT := '';
    v_i INT := 1;
    v_lower_char CHAR(1);
    v_upper_char CHAR(1);
    v_lower_idx INT;
    v_upper_idx INT;
    v_mid_idx INT;
    v_max_len INT := 100; -- Safety limit
    v_charset TEXT := fi_charset();
    v_min_char CHAR(1) := substring(v_charset FROM 1 FOR 1); -- '0'
    v_max_char CHAR(1) := substring(v_charset FROM 62 FOR 1); -- 'z'
    v_mid_char CHAR(1) := substring(v_charset FROM 31 FOR 1); -- 'V' (middle)
BEGIN
    -- Validation
    IF v_lower >= v_upper AND v_upper != '' THEN
        RAISE EXCEPTION 'fi_generate_key_between: lower (%) must be less than upper (%)', v_lower, v_upper;
    END IF;

    -- Edge case: both empty, return middle character
    IF v_lower = '' AND v_upper = '' THEN
        RETURN v_mid_char;
    END IF;

    -- Edge case: only upper provided, prepend character before it
    IF v_lower = '' THEN
        -- Find a key before upper
        v_upper_char := substring(v_upper FROM 1 FOR 1);
        v_upper_idx := fi_char_index(v_upper_char);
        IF v_upper_idx > 0 THEN
            RETURN fi_index_char(v_upper_idx / 2);
        ELSE
            -- Upper starts with '0', append to get below it
            RETURN v_min_char || v_mid_char;
        END IF;
    END IF;

    -- Edge case: only lower provided, increment the key
    IF v_upper = '' THEN
        RETURN fi_increment_key(v_lower);
    END IF;

    -- Main algorithm: find midpoint between lower and upper
    WHILE v_i <= v_max_len LOOP
        v_lower_char := CASE WHEN v_i <= length(v_lower)
                        THEN substring(v_lower FROM v_i FOR 1)
                        ELSE v_min_char END;
        v_upper_char := CASE WHEN v_i <= length(v_upper)
                        THEN substring(v_upper FROM v_i FOR 1)
                        ELSE v_max_char END;

        v_lower_idx := fi_char_index(v_lower_char);
        v_upper_idx := fi_char_index(v_upper_char);

        -- If there's room between characters
        IF v_upper_idx - v_lower_idx > 1 THEN
            v_mid_idx := (v_lower_idx + v_upper_idx) / 2;
            RETURN v_result || fi_index_char(v_mid_idx);
        END IF;

        -- Characters are adjacent or same, carry the lower char and continue
        v_result := v_result || v_lower_char;

        -- If we've reached end of lower and chars are adjacent
        IF v_i > length(v_lower) AND v_upper_idx - v_lower_idx = 1 THEN
            -- INFINITE SPACE: append middle character to lower
            RETURN v_result || v_mid_char;
        END IF;

        v_i := v_i + 1;
    END LOOP;

    -- Safety: if we hit max length, just append
    RETURN v_result || v_mid_char;
END;
$body$;

COMMENT ON FUNCTION public.fi_generate_key_between(TEXT, TEXT) IS
'Generates a fractional index key between two keys. Implements "Infinite Space" logic - appends characters when gap is too small instead of rebalancing. O(1) complexity for list insertions.';