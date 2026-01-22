-- File: migrations/phase1/005b_fi_midpoint.sql

-- Get midpoint character between two characters
CREATE OR REPLACE FUNCTION public.fi_midpoint_char(p_lower CHAR(1), p_upper CHAR(1))
RETURNS CHAR(1)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $fi_midpoint$
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
        v_upper_idx := 62;
    END IF;
    
    v_mid_idx := (v_lower_idx + v_upper_idx) / 2;
    RETURN fi_index_char(v_mid_idx);
END;
$fi_midpoint$;