import { describe, it, expect } from 'vitest';
import { generateKeyBetween } from '@/lib/utils/fractional-index';

describe('Fractional Index Collision Resistance', () => {
    it('should generate unique keys for 1000 insertions at same position', () => {
        const keys = new Set<string>();

        // Simulate 1000 users inserting between 'a0' and 'a1' simultaneously
        const prevKey = 'a0';
        const nextKey = 'a1';

        for (let i = 0; i < 1000; i++) {
            const key = generateKeyBetween(prevKey, nextKey);
            keys.add(key);
        }

        // All keys should be unique due to jitter
        expect(keys.size).toBe(1000);
    });

    it('should maintain sortability for deeply nested insertions', () => {
        let prevKey: string | null = null;
        let nextKey: string | null = 'z';
        const keys: string[] = [];

        // Insert 500 items, always at the beginning
        for (let i = 0; i < 500; i++) {
            const newKey = generateKeyBetween(prevKey, nextKey);
            keys.push(newKey);
            nextKey = newKey;
        }

        // Verify sorting is correct
        const sorted = [...keys].sort();
        expect(keys.reverse()).toEqual(sorted);
    });

    it('should handle alternating insertions without key explosion', () => {
        const keys: string[] = ['a0', 'a5'];

        // Alternate insertions between first two keys 100 times
        for (let i = 0; i < 100; i++) {
            const newKey = generateKeyBetween(keys[0], keys[1]);
            keys.splice(1, 0, newKey);
        }

        // Keys should not exceed reasonable length (max ~20 chars)
        const maxLength = Math.max(...keys.map(k => k.length));
        expect(maxLength).toBeLessThan(25);

        // Verify order is maintained
        const sorted = [...keys].sort();
        expect(keys).toEqual(sorted);
    });
});
