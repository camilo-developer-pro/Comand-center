-- File: migrations/phase1/005c_fi_generate_key.sql

DROP FUNCTION IF EXISTS public.fi_generate_key_between(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.fi_generate_key_between(
    p_lower TEXT DEFAULT NULL,
    p_upper TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $fi_generate$
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
    v_max_len INT := 100;
    v_charset TEXT := fi_charset();
    v_min_char CHAR(1) := substring(v_charset FROM 1 FOR 1);
    v_max_char CHAR(1) := substring(v_charset FROM 62 FOR 1);
    v_mid_char CHAR(1) := substring(v_charset FROM 31 FOR 1);
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
        v_upper_char := substring(v_upper FROM 1 FOR 1);
        v_upper_idx := fi_char_index(v_upper_char);
        IF v_upper_idx > 0 THEN
            RETURN fi_index_char(v_upper_idx / 2);
        ELSE
            RETURN v_min_char || v_mid_char;
        END IF;
    END IF;
    
    -- Edge case: only lower provided, append character after it
    IF v_upper = '' THEN
        RETURN v_lower || v_mid_char;
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
            RETURN v_result || v_mid_char;
        END IF;
        
        v_i := v_i + 1;
    END LOOP;
    
    -- Safety: if we hit max length, just append
    RETURN v_result || v_mid_char;
END;
$fi_generate$;

COMMENT ON FUNCTION public.fi_generate_key_between(TEXT, TEXT) IS 
'Generates a fractional index key between two keys. Implements "Infinite Space" logic - appends characters when gap is too small instead of rebalancing. O(1) complexity for list insertions.';