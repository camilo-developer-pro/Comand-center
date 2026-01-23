/**
 * Ltree Path Transformation Utilities
 * 
 * PostgreSQL ltree extension has strict label constraints:
 * - Labels must match: ^[A-Za-z0-9_]+$
 * - Maximum label length: 256 bytes
 * - No hyphens, dots (used as separator), or special characters
 * 
 * Since UUIDs contain hyphens (e.g., 123e4567-e89b-12d3-a456-426614174000),
 * we must strip them before using in ltree paths.
 */

import { isValidUUID } from './uuid';

// Ltree label validation regex
const LTREE_LABEL_REGEX = /^[A-Za-z0-9_]+$/;

// Maximum ltree label length
const MAX_LABEL_LENGTH = 256;

/**
 * Convert a UUID to an ltree-safe label by removing hyphens
 * @param uuid - Standard UUID string with hyphens
 * @returns Hyphen-stripped UUID safe for ltree labels
 * @throws Error if input is not a valid UUID
 * 
 * @example
 * uuidToLtreeLabel('123e4567-e89b-12d3-a456-426614174000')
 * // Returns: '123e4567e89b12d3a456426614174000'
 */
export function uuidToLtreeLabel(uuid: string): string {
    if (!isValidUUID(uuid)) {
        throw new Error(`Invalid UUID format: ${uuid}`);
    }

    const label = uuid.replace(/-/g, '');

    // Sanity check (should always pass for valid UUIDs)
    if (!LTREE_LABEL_REGEX.test(label)) {
        throw new Error(`UUID transformation produced invalid ltree label: ${label}`);
    }

    return label;
}

/**
 * Convert an ltree label back to standard UUID format
 * @param label - Hyphen-stripped UUID (32 hex characters)
 * @returns Standard UUID with hyphens
 * @throws Error if label is not a valid stripped UUID
 * 
 * @example
 * ltreeLabelToUuid('123e4567e89b12d3a456426614174000')
 * // Returns: '123e4567-e89b-12d3-a456-426614174000'
 */
export function ltreeLabelToUuid(label: string): string {
    if (label.length !== 32 || !/^[0-9a-f]+$/i.test(label)) {
        throw new Error(`Invalid ltree label for UUID conversion: ${label}`);
    }

    return [
        label.slice(0, 8),
        label.slice(8, 12),
        label.slice(12, 16),
        label.slice(16, 20),
        label.slice(20, 32),
    ].join('-');
}

/**
 * Build an ltree path from an array of UUIDs
 * @param uuids - Array of UUID strings representing the path hierarchy
 * @param prefix - Optional prefix (default: 'root')
 * @returns Ltree path string
 * 
 * @example
 * buildLtreePath(['abc-123', 'def-456'])
 * // Returns: 'root.abc123.def456'
 */
export function buildLtreePath(uuids: string[], prefix: string = 'root'): string {
    const labels = uuids.map(uuidToLtreeLabel);
    return [prefix, ...labels].join('.');
}

/**
 * Parse an ltree path back into an array of UUIDs
 * @param path - Ltree path string
 * @param prefix - Expected prefix to strip (default: 'root')
 * @returns Array of UUID strings
 * 
 * @example
 * parseLtreePath('root.abc123def456.ghi789jkl012')
 * // Returns: ['abc123-def4-56gh-i789-jkl012...', ...]
 */
export function parseLtreePath(path: string, prefix: string = 'root'): string[] {
    const parts = path.split('.');

    // Remove prefix
    if (parts[0] === prefix) {
        parts.shift();
    }

    // Convert labels back to UUIDs
    return parts.map(ltreeLabelToUuid);
}

/**
 * Validate that a string is a valid ltree path
 * @param path - Path string to validate
 * @returns boolean
 */
export function isValidLtreePath(path: string): boolean {
    const labels = path.split('.');

    return labels.every(label => {
        if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
            return false;
        }
        return LTREE_LABEL_REGEX.test(label);
    });
}

/**
 * Get the parent path from an ltree path
 * @param path - Current ltree path
 * @returns Parent path, or 'root' if already at root
 * 
 * @example
 * getParentPath('root.abc.def')
 * // Returns: 'root.abc'
 */
export function getParentPath(path: string): string {
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return 'root';
    }
    return path.slice(0, lastDotIndex);
}

/**
 * Get the depth of an ltree path
 * @param path - Ltree path
 * @returns Number of levels (root = 0)
 */
export function getPathDepth(path: string): number {
    if (path === 'root') return 0;
    return path.split('.').length - 1; // Subtract 1 for 'root'
}

/**
 * Check if a path is an ancestor of another
 * @param ancestor - Potential ancestor path
 * @param descendant - Potential descendant path
 * @returns boolean
 */
export function isAncestorOf(ancestor: string, descendant: string): boolean {
    if (ancestor === descendant) return false;
    return descendant.startsWith(ancestor + '.');
}

/**
 * Append a UUID to an existing ltree path
 * @param basePath - Existing ltree path
 * @param uuid - UUID to append
 * @returns New ltree path
 */
export function appendToPath(basePath: string, uuid: string): string {
    const label = uuidToLtreeLabel(uuid);
    return `${basePath}.${label}`;
}
