/**
 * Base62 Fractional Indexing for O(1) Reordering
 * 
 * This implementation generates lexicographically sortable strings
 * that can be inserted between any two existing strings.
 * 
 * CRITICAL: Uses Base62 (0-9, A-Z, a-z) with consistent ordering.
 * The sort order matches JavaScript's default string comparison.
 * 
 * PostgreSQL MUST use COLLATE "C" on the sort_order column
 * to match this behavior.
 */

// Base62 character set in sort order
// Using ASCII order: 0-9 (48-57), A-Z (65-90), a-z (97-122)
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = BASE62_CHARS.length; // 62

// Minimum and maximum characters for boundaries
const MIN_CHAR = BASE62_CHARS[0]; // '0'
const MAX_CHAR = BASE62_CHARS[BASE - 1]; // 'z'

// Default jitter length for collision prevention
const JITTER_LENGTH = 4;

/**
 * Generate a random jitter suffix to prevent collisions
 * in distributed systems
 */
function generateJitter(length: number = JITTER_LENGTH): string {
    let jitter = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        jitter += BASE62_CHARS[array[i] % BASE];
    }
    return jitter;
}

/**
 * Get the midpoint character between two Base62 characters
 */
function getMidpointChar(a: string, b: string): string {
    const aIndex = BASE62_CHARS.indexOf(a);
    const bIndex = BASE62_CHARS.indexOf(b);
    const midIndex = Math.floor((aIndex + bIndex) / 2);
    return BASE62_CHARS[midIndex];
}

/**
 * Generate a fractional index key between two existing keys
 * 
 * @param prev - The key that should sort before the new key (null for start)
 * @param next - The key that should sort after the new key (null for end)
 * @param addJitter - Whether to add random suffix for collision prevention
 * @returns A new key that sorts between prev and next
 */
export function generateKeyBetween(
    prev: string | null,
    next: string | null,
    addJitter: boolean = true
): string {
    let key: string;

    if (prev === null && next === null) {
        // First item - use middle of the range
        key = BASE62_CHARS[Math.floor(BASE / 2)]; // 'P'
    } else if (prev === null) {
        // Insert at start
        key = generateKeyBefore(next!);
    } else if (next === null) {
        // Insert at end
        key = generateKeyAfter(prev);
    } else {
        // Insert between two keys
        key = generateKeyBetweenTwo(prev, next);
    }

    // Add jitter to prevent collisions in distributed scenarios
    return addJitter ? key + generateJitter() : key;
}

/**
 * Generate a key that sorts before the given key
 */
function generateKeyBefore(key: string): string {
    const firstChar = key[0];
    const firstIndex = BASE62_CHARS.indexOf(firstChar);

    if (firstIndex > 0) {
        const midIndex = Math.floor(firstIndex / 2);
        return BASE62_CHARS[midIndex];
    }

    return '0' + generateKeyBefore(key.slice(1) || BASE62_CHARS[Math.floor(BASE / 2)]);
}

/**
 * Generate a key that sorts after the given key
 */
function generateKeyAfter(key: string): string {
    const lastChar = key[key.length - 1];
    const lastIndex = BASE62_CHARS.indexOf(lastChar);

    if (lastIndex < BASE - 1) {
        const midIndex = Math.floor((lastIndex + BASE) / 2);
        return key.slice(0, -1) + BASE62_CHARS[midIndex];
    }

    return key + BASE62_CHARS[Math.floor(BASE / 2)];
}

/**
 * Generate a key between two existing keys
 */
function generateKeyBetweenTwo(prev: string, next: string): string {
    const minLength = Math.min(prev.length, next.length);
    let commonPrefix = '';

    for (let i = 0; i < minLength; i++) {
        if (prev[i] === next[i]) {
            commonPrefix += prev[i];
        } else {
            const prevChar = prev[i];
            const nextChar = next[i];
            const prevIndex = BASE62_CHARS.indexOf(prevChar);
            const nextIndex = BASE62_CHARS.indexOf(nextChar);

            if (nextIndex - prevIndex > 1) {
                const midIndex = Math.floor((prevIndex + nextIndex) / 2);
                return commonPrefix + BASE62_CHARS[midIndex];
            }

            const prevSuffix = prev.slice(i + 1) || MIN_CHAR;
            const nextSuffix = MAX_CHAR.repeat(prevSuffix.length + 1);

            return commonPrefix + prevChar + generateKeyBetweenTwo(prevSuffix, nextSuffix);
        }
    }

    if (prev.length < next.length) {
        return prev + generateKeyBefore(next.slice(prev.length));
    }

    throw new Error(`Cannot generate key between "${prev}" and "${next}"`);
}

/**
 * Generate initial keys for a list of items
 * Useful when importing/creating multiple items at once
 * 
 * @param count - Number of keys to generate
 * @returns Array of evenly distributed keys
 */
export function generateInitialKeys(count: number): string[] {
    const keys: string[] = [];
    const step = Math.floor(BASE / (count + 1));

    for (let i = 0; i < count; i++) {
        const index = step * (i + 1);
        keys.push(BASE62_CHARS[index] + generateJitter());
    }

    return keys;
}

/**
 * Validate that keys are in correct sort order
 */
export function validateKeyOrder(keys: string[]): boolean {
    for (let i = 1; i < keys.length; i++) {
        if (keys[i - 1] >= keys[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Compare two fractional index keys
 */
export function compareKeys(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}
