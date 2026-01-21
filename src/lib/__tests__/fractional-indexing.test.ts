/**
 * Fractional Indexing Test Suite (V2.1)
 * Verifies O(1) ordering and lexicographical correctness
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Manual env loader
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
} catch (e) {
    console.error('Failed to load .env.local manually:', e);
}

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

let TEST_WORKSPACE_ID: string;

describe('Fractional Indexing Core Logic', () => {
    let testItems: { id: string; rank_key: string; name: string }[] = [];

    beforeAll(async () => {
        // 1. Fetch workspace using helper (bypasses RLS)
        const { data: wsId, error: wsError } = await supabase.rpc('get_test_workspace_id');
        if (wsError || !wsId) {
            console.error('Workspace fetch failed:', wsError);
            throw new Error('No workspace found for test');
        }
        TEST_WORKSPACE_ID = wsId;
        console.log('Testing in workspace:', TEST_WORKSPACE_ID);

        // 2. Initial Cleanup using helper
        const { error: cleanError } = await supabase.rpc('cleanup_test_workspace_items', {
            p_workspace_id: TEST_WORKSPACE_ID
        });
        if (cleanError) console.error('Initial cleanup error:', cleanError);
    });

    afterAll(async () => {
        // Final Cleanup
        await supabase.rpc('cleanup_test_workspace_items', {
            p_workspace_id: TEST_WORKSPACE_ID
        });
    });

    it('should generate correct Base62 midpoint keys', async () => {
        const { data: result1 } = await supabase.rpc('fi_generate_key_between', {
            key_before: null,
            key_after: null,
        }) as any;
        expect(result1).toBe('V');

        const { data: result2 } = await supabase.rpc('fi_generate_key_between', {
            key_before: 'a',
            key_after: 'c',
        }) as any;
        expect(result2).toBe('b');

        const { data: result3 } = await supabase.rpc('fi_generate_key_between', {
            key_before: 'a',
            key_after: 'b',
        }) as any;
        expect(result3 > 'a').toBe(true);
        expect(result3 < 'b').toBe(true);
    });

    it('should insert items at correct positions', async () => {
        // Insert B (middle)
        const { data: item1, error: e1 } = await supabase.rpc('insert_item_at_position', {
            p_workspace_id: TEST_WORKSPACE_ID,
            p_parent_id: null,
            p_name: 'Test Item B',
            p_item_type: 'folder'
        }) as any;
        if (e1) throw e1;
        console.log('Item B Rank:', item1.rank_key);
        expect(item1.success).toBe(true);
        testItems.push({ id: item1.id, rank_key: item1.rank_key, name: 'Test Item B' });

        // Insert A (start)
        const { data: item2, error: e2 } = await supabase.rpc('insert_item_at_position', {
            p_workspace_id: TEST_WORKSPACE_ID,
            p_parent_id: null,
            p_name: 'Test Item A',
            p_item_type: 'folder',
            p_next_sibling_id: item1.id
        }) as any;
        if (e2) throw e2;
        console.log('Item A Rank:', item2.rank_key);
        expect(item2.rank_key < item1.rank_key).toBe(true);
        testItems.push({ id: item2.id, rank_key: item2.rank_key, name: 'Test Item A' });

        // Insert C (end)
        const { data: item3, error: e3 } = await supabase.rpc('insert_item_at_position', {
            p_workspace_id: TEST_WORKSPACE_ID,
            p_parent_id: null,
            p_name: 'Test Item C',
            p_item_type: 'folder',
            p_prev_sibling_id: item1.id
        }) as any;
        if (e3) throw e3;
        console.log('Item C Rank:', item3.rank_key);
        expect(item3.rank_key > item1.rank_key).toBe(true);
        testItems.push({ id: item3.id, rank_key: item3.rank_key, name: 'Test Item C' });
    });

    it('should maintain lexicographical order after reordering', async () => {
        const itemC = testItems.find(i => i.name === 'Test Item C')!;
        const itemA = testItems.find(i => i.name === 'Test Item A')!;
        const itemB = testItems.find(i => i.name === 'Test Item B')!;

        // Move C between A and B
        const { data: moveResult, error: eM } = await supabase.rpc('reorder_item', {
            p_item_id: itemC.id,
            p_prev_sibling_id: itemA.id,
            p_next_sibling_id: itemB.id
        });
        if (eM) throw eM;
        expect(moveResult.success).toBe(true);

        // Verify order via helper
        const { data: after, error: eA } = await supabase.rpc('get_test_ordered_items', {
            p_workspace_id: TEST_WORKSPACE_ID
        }) as any;
        if (eA) throw eA;

        const names = after.map((i: any) => i.name);
        expect(names).toEqual(['Test Item A', 'Test Item C', 'Test Item B']);
    });

    it('should correctly handle stress testing of 10 consecutive start-insertions', async () => {
        let currentFirstId: string | null = testItems.sort((a, b) => a.rank_key.localeCompare(b.rank_key))[0].id;

        for (let i = 0; i < 10; i++) {
            const { data, error } = await supabase.rpc('insert_item_at_position', {
                p_workspace_id: TEST_WORKSPACE_ID,
                p_parent_id: null,
                p_name: `Stress Item ${i}`,
                p_item_type: 'folder',
                p_next_sibling_id: currentFirstId
            }) as any;
            if (error) throw error;
            expect(data.success).toBe(true);
            currentFirstId = data.id;
        }

        const { data: finalOrder, error: eF } = await supabase.rpc('get_test_ordered_items', {
            p_workspace_id: TEST_WORKSPACE_ID
        }) as any;
        if (eF) throw eF;

        const keys = finalOrder.map((i: any) => i.rank_key);
        const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));
        expect(keys).toEqual(sortedKeys);
    });
});
