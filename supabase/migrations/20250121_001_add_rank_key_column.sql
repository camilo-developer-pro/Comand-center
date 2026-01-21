-- Migration: Add Fractional Indexing Support
-- Version: V2.1
-- Description: Adds rank_key column for O(1) reordering operations
-- Reversible: YES

-- ============================================
-- FORWARD MIGRATION
-- ============================================

-- Step 1: Add the rank_key column
-- COLLATE "C" ensures byte-by-byte comparison (critical for fractional indexing)
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS rank_key TEXT COLLATE "C";

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.items.rank_key IS 
'Fractional indexing key for O(1) reordering. Uses Base62 lexicographical strings. COLLATE C ensures deterministic sorting.';

-- Step 3: Create unique constraint per parent to prevent collisions
-- This allows same rank_key in different folders but unique within siblings
ALTER TABLE public.items
ADD CONSTRAINT items_unique_rank_per_parent 
UNIQUE (parent_id, rank_key)
DEFERRABLE INITIALLY DEFERRED;

-- Step 4: Create index for fast sibling ordering queries
CREATE INDEX IF NOT EXISTS idx_items_parent_rank_key 
ON public.items (parent_id, rank_key COLLATE "C");

-- Step 5: Temporarily allow NULL (will be NOT NULL after backfill)
-- We keep it nullable during transition period

-- ============================================
-- ROLLBACK MIGRATION (run manually if needed)
-- ============================================
-- DROP INDEX IF EXISTS idx_items_parent_rank_key;
-- ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_unique_rank_per_parent;
-- ALTER TABLE public.items DROP COLUMN IF EXISTS rank_key;
