import { generateKeyBetween } from '../src/lib/utils/fractional-index';
import assert from 'assert';

async function runFractionalStressTest() {
    console.log('🚀 Starting Fractional Index Stress Test...');

    // Test 1: 1000 insertions at same position
    console.log('\n--- Test 1: 1000 Insertions at Same Position ---');
    const keys = new Set<string>();
    for (let i = 0; i < 1000; i++) {
        keys.add(generateKeyBetween('a0', 'a1'));
    }
    console.log(`Unique keys generated: ${keys.size}/1000`);
    assert(keys.size === 1000, 'Collisions detected in fractional indexing');

    // Test 2: Deep nesting sortability
    console.log('\n--- Test 2: Deep Nesting Sortability ---');
    let nextKey: string | null = 'z';
    const generated: string[] = [];
    for (let i = 0; i < 500; i++) {
        const key = generateKeyBetween(null, nextKey);
        generated.push(key);
        nextKey = key;
    }
    const reversed = [...generated].reverse();
    const sorted = [...generated].sort();
    assert.deepStrictEqual(reversed, sorted, 'Sort order failed for deep nesting');
    console.log('✅ Sortability maintained for 500 levels');

    console.log('\n✅ All fractional index stress tests passed!');
}

runFractionalStressTest().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
