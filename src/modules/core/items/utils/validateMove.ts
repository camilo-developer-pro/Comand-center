/**
 * validateMove Utility
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Client-side validation logic for item move operations to provide 
 * immediate feedback and prevent invalid operations.
 */

import type { ItemTreeNode } from '../types';

export interface MoveValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates if a move operation is allowed BEFORE sending to server.
 * 
 * Rules:
 * 1. Cannot move item to itself.
 * 2. Target parent must be a folder.
 * 3. Cannot move a folder into its own descendant (cycle detection).
 */
export function validateMove(
    itemId: string,
    newParentId: string | null,
    tree: ItemTreeNode[]
): MoveValidationResult {
    // Rule 1: Cannot move item to itself
    if (itemId === newParentId) {
        return {
            valid: false,
            error: "You can't move an item into itself."
        };
    }

    // Find the item being moved
    const item = findItemInTree(itemId, tree);
    if (!item) {
        return {
            valid: false,
            error: "The item you're trying to move could not be found."
        };
    }

    // Rule 2: If moving to a parent, that parent must be a folder
    if (newParentId) {
        const newParent = findItemInTree(newParentId, tree);
        if (!newParent) {
            return {
                valid: false,
                error: "Selected target folder no longer exists."
            };
        }
        if (newParent.item_type !== 'folder') {
            return {
                valid: false,
                error: "Items can only be moved into folders."
            };
        }

        // Rule 3: Cannot move folder into its own descendant (cycle detection)
        if (item.item_type === 'folder') {
            if (isDescendant(newParentId, item)) {
                return {
                    valid: false,
                    error: "You cannot move a folder into one of its own subfolders."
                };
            }
        }
    }

    return { valid: true };
}

/**
 * Recursively find an item in the tree by its ID
 */
function findItemInTree(id: string, nodes: ItemTreeNode[]): ItemTreeNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children && node.children.length > 0) {
            const found = findItemInTree(id, node.children);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Recursively check if an ID is a descendant of a given node
 */
function isDescendant(targetId: string, parentNode: ItemTreeNode): boolean {
    if (!parentNode.children) return false;

    for (const child of parentNode.children) {
        if (child.id === targetId) return true;
        if (isDescendant(targetId, child)) return true;
    }
    return false;
}
