-- Migration: Fractional Indexing Core Functions
-- Version: V2.1
-- Description: PL/pgSQL functions for generating midpoint keys

-- ============================================
-- BASE62 CHARACTER SET AND UTILITIES
-- ============================================

-- Base62 alphabet in sorted order for lexicographical comparison
CREATE OR REPLACE FUNCTION fi_get_alphabet()
RETURNS TEXT AS $$
BEGIN
    -- Characters in ascending lexicographical order (COLLATE "C")
    RETURN '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get character at index (0-61)
CREATE OR REPLACE FUNCTION fi_char_at(idx INTEGER)
RETURNS CHAR AS $$
DECLARE
    alphabet TEXT := fi_get_alphabet();
BEGIN
    IF idx < 0 OR idx > 61 THEN
        RAISE EXCEPTION 'Index out of bounds: %', idx;
    END IF;
    RETURN SUBSTRING(alphabet FROM idx + 1 FOR 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get index of character (0-61)
CREATE OR REPLACE FUNCTION fi_index_of(c CHAR)
RETURNS INTEGER AS $$
DECLARE
    alphabet TEXT := fi_get_alphabet();
    pos INTEGER;
BEGIN
    pos := POSITION(c IN alphabet);
    IF pos = 0 THEN
        RAISE EXCEPTION 'Invalid character for fractional indexing: %', c;
    END IF;
    RETURN pos - 1; -- Zero-indexed
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- MIDPOINT CALCULATION
-- ============================================

-- Calculate midpoint between two fractional index keys
-- Parameters:
--   key_before: The key that should sort BEFORE the result (NULL = start of list)
--   key_after: The key that should sort AFTER the result (NULL = end of list)
-- Returns: A key that sorts between key_before and key_after

CREATE OR REPLACE FUNCTION fi_generate_key_between(
    key_before TEXT DEFAULT NULL,
    key_after TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    alphabet TEXT := fi_get_alphabet();
    midpoint_char CHAR;
    result TEXT := '';
    i INTEGER := 1;
    len_before INTEGER;
    len_after INTEGER;
    char_before CHAR;
    char_after CHAR;
    idx_before INTEGER;
    idx_after INTEGER;
    mid_idx INTEGER;
BEGIN
    -- Standardize empty strings
    IF key_before = '' THEN key_before := NULL; END IF;
    IF key_after = '' THEN key_after := NULL; END IF;

    -- Handle identical keys
    IF key_before IS NOT DISTINCT FROM key_after AND key_before IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot generate key between identical values: %', key_before;
    END IF;

    -- Handle edge cases
    IF key_before IS NULL AND key_after IS NULL THEN
        -- Empty list: return middle of alphabet
        RETURN 'V'; 
    END IF;
    
    IF key_before IS NULL THEN
        -- Insert at start: find key before key_after
        idx_after := fi_index_of(LEFT(key_after, 1));
        IF idx_after > 0 THEN
            mid_idx := idx_after / 2;
            -- If the midpoint would be '0', recurse to get '0V', '0F', etc.
            -- This preserves infinite space before the floor.
            IF mid_idx = 0 THEN
                RETURN '0' || fi_generate_key_between(NULL, SUBSTRING(key_after FROM 2));
            END IF;
            RETURN fi_char_at(mid_idx);
        ELSE
            -- First char is '0', must prepend and go deeper
            RETURN '0' || fi_generate_key_between(NULL, SUBSTRING(key_after FROM 2));
        END IF;
    END IF;
    
    IF key_after IS NULL THEN
        -- Insert at end: find key after key_before
        idx_before := fi_index_of(LEFT(key_before, 1));
        IF idx_before < 61 THEN
            mid_idx := (idx_before + 62) / 2;
            -- If midpoint is 'z' (61), recurse to avoid the ceiling
            IF mid_idx = 61 THEN
                RETURN 'z' || fi_generate_key_between(SUBSTRING(key_before FROM 2), NULL);
            END IF;
            RETURN fi_char_at(mid_idx);
        ELSE
            -- First char is 'z', must prepend and go deeper
            RETURN 'z' || fi_generate_key_between(SUBSTRING(key_before FROM 2), NULL);
        END IF;
    END IF;
    
    -- Both keys provided: find midpoint
    len_before := LENGTH(key_before);
    len_after := LENGTH(key_after);
    
    -- Iterate through characters to find divergence point
    WHILE i <= GREATEST(len_before, len_after) LOOP
        -- Get characters (treat missing chars as boundaries)
        IF i <= len_before THEN
            char_before := SUBSTRING(key_before FROM i FOR 1);
            idx_before := fi_index_of(char_before);
        ELSE
            idx_before := -1; -- Conceptually smaller than '0'
        END IF;
        
        IF i <= len_after THEN
            char_after := SUBSTRING(key_after FROM i FOR 1);
            idx_after := fi_index_of(char_after);
        ELSE
            idx_after := 62; -- Conceptually larger than 'z'
        END IF;
        
        IF idx_after - idx_before > 1 THEN
            -- Gap exists: insert midpoint
            mid_idx := (idx_before + idx_after) / 2;
            RETURN result || fi_char_at(mid_idx);
        ELSIF idx_after - idx_before = 1 THEN
            -- Adjacent characters: carry forward and append
            result := result || char_before;
            -- Continue with next position, treating key_after as if starting fresh
            RETURN result || fi_generate_key_between(
                CASE WHEN i < len_before THEN SUBSTRING(key_before FROM i + 1) ELSE NULL END,
                NULL
            );
        ELSE
            -- Same character: add to result and continue
            result := result || char_before;
        END IF;
        
        i := i + 1;
    END LOOP;
    
    -- Fallback: append middle character
    RETURN result || 'V';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- CONVENIENCE WRAPPER FOR ITEMS TABLE
-- ============================================

-- Generate a rank_key for inserting between two siblings
CREATE OR REPLACE FUNCTION generate_item_rank_key(
    p_parent_id UUID,
    p_previous_sibling_id UUID DEFAULT NULL,
    p_next_sibling_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_key_before TEXT;
    v_key_after TEXT;
BEGIN
    -- Get the rank_key of the previous sibling
    IF p_previous_sibling_id IS NOT NULL THEN
        SELECT rank_key INTO v_key_before
        FROM public.items
        WHERE id = p_previous_sibling_id AND parent_id IS NOT DISTINCT FROM p_parent_id;
    END IF;
    
    -- Get the rank_key of the next sibling
    IF p_next_sibling_id IS NOT NULL THEN
        SELECT rank_key INTO v_key_after
        FROM public.items
        WHERE id = p_next_sibling_id AND parent_id IS NOT DISTINCT FROM p_parent_id;
    END IF;
    
    -- Generate midpoint
    RETURN fi_generate_key_between(v_key_before, v_key_after);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fi_get_alphabet TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_char_at TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_index_of TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fi_generate_key_between TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_item_rank_key TO authenticated, anon;
