import { describe, it, expect } from 'vitest';
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

describe('Simple Test', () => {
    it('should work', () => {
        expect(1 + 1).toBe(2);
    });
});
