-- Test cases for fractional indexing RPCs
-- Run these in Supabase SQL Editor after applying migration 20250121_004

-- 1. Setup: Get a valid workspace ID
DO $$
DECLARE
    v_ws_id UUID;
    v_folder_a UUID;
    v_folder_b UUID;
    v_folder_c UUID;
    v_result JSON;
BEGIN
    SELECT id INTO v_ws_id FROM public.workspaces LIMIT 1;
    
    -- 2. Test: Insert items at root level
    RAISE NOTICE 'Testing insertion...';
    
    -- Insert A
    SELECT insert_item_at_position(v_ws_id, NULL, 'Test Item A', 'folder') INTO v_result;
    v_folder_a := (v_result->>'id')::UUID;
    
    -- Insert C
    SELECT insert_item_at_position(v_ws_id, NULL, 'Test Item C', 'folder') INTO v_result;
    v_folder_c := (v_result->>'id')::UUID;
    
    -- Insert B between A and C
    SELECT insert_item_at_position(v_ws_id, NULL, 'Test Item B', 'folder', v_folder_a, v_folder_c) INTO v_result;
    v_folder_b := (v_result->>'id')::UUID;
    
    RAISE NOTICE 'Insertion results: A(%), B(%), C(%)', v_folder_a, v_folder_b, v_folder_c;
    
    -- 3. Verify ordering
    RAISE NOTICE 'Verifying initial ordering...';
    -- This should show A, B, C in alphabetical order based on rank_key
    -- Run separate SELECT below for visual verification
    
    -- 4. Test: Reorder (Move C to the very beginning)
    RAISE NOTICE 'Testing reorder (C to start)...';
    SELECT reorder_item(v_folder_c, NULL, v_folder_a) INTO v_result;
    
    -- 5. Test: Subtree Move (Move B into A)
    RAISE NOTICE 'Testing subtree move (B into A)...';
    SELECT move_item_v2(v_folder_b, v_folder_a, NULL, NULL) INTO v_result;
    
END $$;

-- Visual Verification Query
-- Run this AFTER the DO block above
SELECT name, parent_id, rank_key, path
FROM public.items
WHERE name LIKE 'Test Item %'
ORDER BY rank_key COLLATE "C";
