import { describe, it, expect } from 'vitest';
import {
    uuidToLtreeLabel,
    ltreeLabelToUuid,
    buildLtreePath,
    parseLtreePath,
    isValidLtreePath,
    appendToPath,
} from '../ltree';

describe('ltree utilities', () => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';
    const expectedLabel = '123e4567e89b12d3a456426614174000';

    describe('uuidToLtreeLabel', () => {
        it('should strip hyphens from UUID', () => {
            expect(uuidToLtreeLabel(testUuid)).toBe(expectedLabel);
        });

        it('should throw on invalid UUID', () => {
            expect(() => uuidToLtreeLabel('not-a-uuid')).toThrow();
        });
    });

    describe('ltreeLabelToUuid', () => {
        it('should restore hyphens to UUID', () => {
            expect(ltreeLabelToUuid(expectedLabel)).toBe(testUuid);
        });
    });

    describe('buildLtreePath', () => {
        it('should build path from UUIDs', () => {
            const uuids = [testUuid, testUuid];
            const path = buildLtreePath(uuids);
            expect(path).toBe(`root.${expectedLabel}.${expectedLabel}`);
        });
    });

    describe('isValidLtreePath', () => {
        it('should accept valid paths', () => {
            expect(isValidLtreePath('root')).toBe(true);
            expect(isValidLtreePath('root.abc123.def456')).toBe(true);
        });

        it('should reject invalid paths', () => {
            expect(isValidLtreePath('root.abc-123')).toBe(false); // hyphen
            expect(isValidLtreePath('root..abc')).toBe(false); // empty label
        });
    });
});
