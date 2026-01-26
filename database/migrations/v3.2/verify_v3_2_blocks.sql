-- V3.2 Blocks Schema and RLS Verification
-- File: verify_v3_2_blocks.sql
-- Purpose: Verify the complete v3.2 blocks implementation including schema, path trigger, and RLS

DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
    v_function_exists BOOLEAN;
    v_index_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== V3.2 Blocks Implementation Verification ===';
    RAISE NOTICE '';

    -- 1. Verify blocks_v3 table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blocks_v3'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
        RAISE NOTICE '✅ blocks_v3 table exists';
    ELSE
        RAISE NOTICE '❌ blocks_v3 table does not exist';
    END IF;

    -- 2. Verify RLS is enabled on blocks_v3
    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'blocks_v3';
    
    IF v_rls_enabled THEN
        RAISE NOTICE '✅ RLS is enabled on blocks_v3';
    ELSE
        RAISE NOTICE '❌ RLS is NOT enabled on blocks_v3';
    END IF;

    -- 3. Verify all 4 RLS policies exist
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies 
    WHERE tablename = 'blocks_v3' AND schemaname = 'public';
    
    IF v_policy_count = 4 THEN
        RAISE NOTICE '✅ All 4 RLS policies exist (found % policies)', v_policy_count;
    ELSE
        RAISE NOTICE '❌ Expected 4 RLS policies but found %', v_policy_count;
    END IF;

    -- 4. Verify is_workspace_member() function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'is_workspace_member'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ is_workspace_member() function exists';
    ELSE
        RAISE NOTICE '❌ is_workspace_member() function does not exist';
    END IF;

    -- 5. Verify uuid_to_ltree_label() function exists (from 002_blocks_path_trigger.sql)
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'uuid_to_ltree_label'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ uuid_to_ltree_label() function exists';
    ELSE
        RAISE NOTICE '❌ uuid_to_ltree_label() function does not exist';
    END IF;

    -- 6. Verify blocks_path_trigger_fn() function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'blocks_path_trigger_fn'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ blocks_path_trigger_fn() function exists';
    ELSE
        RAISE NOTICE '❌ blocks_path_trigger_fn() function does not exist';
    END IF;

    -- 7. Verify blocks_path_sync trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'blocks_v3'
        AND t.tgname = 'blocks_path_sync'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ blocks_path_sync trigger exists';
    ELSE
        RAISE NOTICE '❌ blocks_path_sync trigger does not exist';
    END IF;

    -- 8. Verify performance index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'workspace_members'
        AND indexname = 'idx_workspace_members_lookup'
    ) INTO v_index_exists;
    
    IF v_index_exists THEN
        RAISE NOTICE '✅ idx_workspace_members_lookup index exists';
    ELSE
        RAISE NOTICE '❌ idx_workspace_members_lookup index does not exist';
    END IF;

    -- 9. Verify all required columns exist in blocks_v3
    RAISE NOTICE '';
    RAISE NOTICE 'Verifying blocks_v3 columns:';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'id') THEN
        RAISE NOTICE '  ✅ id column exists';
    ELSE
        RAISE NOTICE '  ❌ id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'workspace_id') THEN
        RAISE NOTICE '  ✅ workspace_id column exists';
    ELSE
        RAISE NOTICE '  ❌ workspace_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'user_id') THEN
        RAISE NOTICE '  ✅ user_id column exists';
    ELSE
        RAISE NOTICE '  ❌ user_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'parent_id') THEN
        RAISE NOTICE '  ✅ parent_id column exists';
    ELSE
        RAISE NOTICE '  ❌ parent_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'path') THEN
        RAISE NOTICE '  ✅ path column exists';
    ELSE
        RAISE NOTICE '  ❌ path column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'type') THEN
        RAISE NOTICE '  ✅ type column exists';
    ELSE
        RAISE NOTICE '  ❌ type column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'sort_order') THEN
        RAISE NOTICE '  ✅ sort_order column exists';
    ELSE
        RAISE NOTICE '  ❌ sort_order column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blocks_v3' AND column_name = 'content') THEN
        RAISE NOTICE '  ✅ content column exists';
    ELSE
        RAISE NOTICE '  ❌ content column missing';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=== Verification Complete ===';
    
    -- Summary
    IF v_table_exists AND v_rls_enabled AND v_policy_count = 4 THEN
        RAISE NOTICE '✅ V3.2 Blocks implementation appears to be correctly installed';
    ELSE
        RAISE NOTICE '❌ V3.2 Blocks implementation has issues that need attention';
    END IF;
END $$;