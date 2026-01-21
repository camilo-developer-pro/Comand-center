-- Migration: Backfill rank_key from existing rank column
-- Version: V2.1
-- Description: Converts integer ranks to fractional index strings
-- IMPORTANT: Run during low-traffic period

-- ============================================
-- BACKFILL FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION initialize_rank_keys()
RETURNS TABLE(
    items_updated INTEGER,
    execution_time_ms NUMERIC
) AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_count INTEGER := 0;
    v_item RECORD;
    v_new_key TEXT;
    v_alphabet TEXT := fi_get_alphabet();
BEGIN
    v_start_time := clock_timestamp();
    
    -- Process items grouped by parent_id, ordered by existing sort_order
    FOR v_item IN 
        SELECT 
            id,
            parent_id,
            COALESCE(sort_order, 0) as current_rank,
            ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY COALESCE(sort_order, 0), created_at) - 1 as zero_based_rank
        FROM public.items
        WHERE rank_key IS NULL
        ORDER BY parent_id, current_rank
    LOOP
        -- Generate key from zero-based position
        -- Format: prefix + suffix where each can be 0-61 (Base62)
        -- This gives us 62*62 = 3844 positions before needing longer keys
        v_new_key := fi_char_at((v_item.zero_based_rank / 62)::INTEGER) || 
                     fi_char_at((v_item.zero_based_rank % 62)::INTEGER);
        
        UPDATE public.items
        SET rank_key = v_new_key
        WHERE id = v_item.id;
        
        v_count := v_count + 1;
        
        -- Progress logging every 1000 items
        IF v_count % 1000 = 0 THEN
            RAISE NOTICE 'Processed % items...', v_count;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_count,
        EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EXECUTE BACKFILL
-- ============================================

-- Run the backfill
SELECT * FROM initialize_rank_keys();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check for any NULL rank_keys (should be 0)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM public.items 
    WHERE rank_key IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Backfill incomplete: % items still have NULL rank_key', null_count;
    END IF;
    
    RAISE NOTICE 'Verification passed: All items have rank_key assigned';
END $$;

-- Verify ordering is preserved
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    WITH order_comparison AS (
        SELECT 
            id,
            parent_id,
            sort_order as old_rank,
            rank_key,
            ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY sort_order) as old_position,
            ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY rank_key COLLATE "C") as new_position
        FROM public.items
        WHERE sort_order IS NOT NULL
    )
    SELECT COUNT(*) INTO mismatch_count
    FROM order_comparison
    WHERE old_position != new_position;
    
    IF mismatch_count > 0 THEN
        RAISE EXCEPTION 'Order verification failed: % items have mismatched positions', mismatch_count;
    END IF;
    
    RAISE NOTICE 'Order verification passed: All item positions preserved';
END $$;

-- ============================================
-- MAKE COLUMN NOT NULL (After verification)
-- ============================================

-- Only run this after confirming backfill success
ALTER TABLE public.items
ALTER COLUMN rank_key SET NOT NULL;

-- Add default for new items (will be overwritten by RPC, but safety net)
ALTER TABLE public.items
ALTER COLUMN rank_key SET DEFAULT 'V';
