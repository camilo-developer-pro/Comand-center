import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const LATENCY_TARGET_MS = 1000;  // Sub-second target
const TEST_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

test.describe('Real-time Sync Latency', () => {
    let supabase: ReturnType<typeof createClient>;

    test.beforeAll(() => {
        supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    });

    test('dashboard stats update within target latency', async ({ page }) => {
        // Navigate to dashboard
        await page.goto(`/dashboard/${TEST_WORKSPACE_ID}/overview`);

        // Wait for initial load
        await page.waitForSelector('[data-testid="dashboard-stats"]');

        // Get initial count
        const initialCount = await page.locator('[data-testid="total-items-count"]').textContent();

        // Record start time
        const startTime = Date.now();

        // Insert item via Supabase (triggers delta)
        const { data: item } = await supabase
            .from('items')
            .insert({
                workspace_id: TEST_WORKSPACE_ID,
                item_type: 'document',
                name: `latency_test_${Date.now()}`
            })
            .select('id')
            .single();

        // Wait for UI to update
        await page.waitForFunction(
            (initial) => {
                const el = document.querySelector('[data-testid="total-items-count"]');
                return el && el.textContent !== initial;
            },
            initialCount,
            { timeout: 5000 }
        );

        // Record end time
        const endTime = Date.now();
        const latency = endTime - startTime;

        console.log(`[Latency Test] DB → UI latency: ${latency}ms`);

        // Assert latency target
        expect(latency).toBeLessThan(LATENCY_TARGET_MS);

        // Cleanup
        if (item) {
            await supabase.from('items').delete().eq('id', item.id);
        }
    });

    test('graph updates propagate in real-time', async ({ page }) => {
        // Navigate to graph view
        await page.goto(`/dashboard/${TEST_WORKSPACE_ID}/graph`);

        // Wait for graph to load
        await page.waitForSelector('[data-testid="neural-graph"]');

        // Create two entities
        const { data: entity1 } = await supabase
            .from('entities')
            .insert({ workspace_id: TEST_WORKSPACE_ID, canonical_name: 'Test Node A' })
            .select('id')
            .single();

        const { data: entity2 } = await supabase
            .from('entities')
            .insert({ workspace_id: TEST_WORKSPACE_ID, canonical_name: 'Test Node B' })
            .select('id')
            .single();

        const startTime = Date.now();

        // Create edge (triggers graph_changed notification)
        await supabase.from('relationships').insert({
            workspace_id: TEST_WORKSPACE_ID,
            source_entity_id: entity1!.id,
            target_entity_id: entity2!.id,
            relationship_type: 'test_edge'
        });

        // Wait for edge to appear in graph
        await page.waitForSelector(`[data-testid="edge-${entity1!.id}-${entity2!.id}"]`, {
            timeout: 5000
        });

        const latency = Date.now() - startTime;
        console.log(`[Latency Test] Graph edge latency: ${latency}ms`);

        expect(latency).toBeLessThan(LATENCY_TARGET_MS);

        // Cleanup
        await supabase.from('relationships').delete()
            .eq('source_entity_id', entity1!.id);
        await supabase.from('entities').delete()
            .in('id', [entity1!.id, entity2!.id]);
    });

    test('connection recovery after disconnect', async ({ page }) => {
        await page.goto(`/dashboard/${TEST_WORKSPACE_ID}/overview`);

        // Get connection indicator
        const connectionIndicator = page.locator('[data-testid="realtime-status"]');

        // Should start connected
        await expect(connectionIndicator).toHaveAttribute('data-connected', 'true');

        // Simulate network interruption
        await page.context().setOffline(true);

        // Wait for disconnection detection
        await expect(connectionIndicator).toHaveAttribute('data-connected', 'false', {
            timeout: 10000
        });

        // Restore network
        await page.context().setOffline(false);

        // Should reconnect
        await expect(connectionIndicator).toHaveAttribute('data-connected', 'true', {
            timeout: 15000
        });
    });
});