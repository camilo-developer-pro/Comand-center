/**
 * UUIDv7 Generation Utility
 * 
 * UUIDv7 embeds a Unix timestamp in the first 48 bits, making IDs:
 * - Time-sortable (newer IDs sort after older ones)
 * - Efficient for B-tree indexes (sequential inserts)
 * - Globally unique (random suffix prevents collisions)
 * 
 * Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
 * Where t = timestamp, 7 = version, y = variant, x = random
 */

/**
 * Generate a UUIDv7 string
 * @returns RFC 9562 compliant UUIDv7
 */
export function generateUUIDv7(): string {
    const timestamp = Date.now();

    // Get timestamp as 48-bit value (milliseconds since Unix epoch)
    const timestampHex = timestamp.toString(16).padStart(12, '0');

    // Generate random bytes for the rest
    const randomBytes = new Uint8Array(10);
    crypto.getRandomValues(randomBytes);

    // Convert random bytes to hex
    const randomHex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Build UUIDv7 string
    // Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
    const uuid = [
        timestampHex.slice(0, 8),                    // time_high (32 bits)
        timestampHex.slice(8, 12),                   // time_mid (16 bits)
        '7' + randomHex.slice(0, 3),                 // version (4) + rand_a (12 bits)
        ((parseInt(randomHex.slice(3, 5), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + randomHex.slice(5, 7), // variant (2) + rand_b (14 bits)
        randomHex.slice(7, 19),                      // rand_c (48 bits)
    ].join('-');

    return uuid;
}

/**
 * Extract timestamp from UUIDv7
 * @param uuid - A UUIDv7 string
 * @returns Date object representing when the UUID was generated
 */
export function extractTimestampFromUUIDv7(uuid: string): Date {
    const cleanUuid = uuid.replace(/-/g, '');
    const timestampHex = cleanUuid.slice(0, 12);
    const timestamp = parseInt(timestampHex, 16);
    return new Date(timestamp);
}

/**
 * Validate that a string is a valid UUID format
 * @param uuid - String to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate that a UUID is specifically UUIDv7
 * @param uuid - UUID string to validate
 * @returns boolean indicating if the UUID is v7
 */
export function isUUIDv7(uuid: string): boolean {
    if (!isValidUUID(uuid)) return false;
    // Check version nibble (13th character should be '7')
    return uuid.charAt(14) === '7';
}

/**
 * Compare two UUIDv7s by their embedded timestamps
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareUUIDv7(a: string, b: string): number {
    const timestampA = extractTimestampFromUUIDv7(a).getTime();
    const timestampB = extractTimestampFromUUIDv7(b).getTime();
    return timestampA - timestampB;
}
