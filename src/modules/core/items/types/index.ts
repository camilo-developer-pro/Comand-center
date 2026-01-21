/**
 * Items Module Types
 * 
 * V2.0 Phase 1: Hierarchical File System
 * 
 * Type definitions for items (folders and documents) in the ltree-based
 * hierarchical file system.
 */

// ============================================================
// Item Types
// ============================================================

/**
 * Item type enum matching database item_type
 */
export type ItemType = 'folder' | 'document';

/**
 * Base item interface matching database schema
 */
export interface Item {
    id: string;
    name: string;
    item_type: ItemType;
    path: string;           // ltree path as string (e.g., 'root.folder1.subfolder2')
    workspace_id: string;
    created_by: string;
    document_id: string | null;
    parent_id: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

/**
 * Item with computed properties for UI rendering
 */
export interface ItemWithMeta extends Item {
    depth: number;          // Calculated from path (nlevel)
    hasChildren: boolean;   // Whether item has any descendants
    childCount: number;     // Count of direct children only
}

/**
 * Tree node for recursive rendering in UI
 */
export interface ItemTreeNode extends ItemWithMeta {
    children: ItemTreeNode[];
}

// ============================================================
// Insert Types
// ============================================================

/**
 * Parameters for creating a new folder
 */
export interface CreateFolderParams {
    name: string;
    parentId: string | null;  // null = root level
    workspaceId: string;
}

/**
 * Parameters for creating a document item
 * (Usually called internally when a document is created)
 */
export interface CreateDocumentItemParams {
    name: string;
    parentId: string | null;
    workspaceId: string;
    documentId: string;
}

// ============================================================
// Update Types
// ============================================================

/**
 * Parameters for renaming an item
 */
export interface RenameItemParams {
    itemId: string;
    newName: string;
}

/**
 * Parameters for moving an item to a new parent
 */
export interface MoveItemParams {
    itemId: string;
    newParentId: string | null;  // null = move to root
}

/**
 * Parameters for reordering items within the same parent
 */
export interface ReorderItemsParams {
    itemIds: string[];      // Ordered list of item IDs
    parentId: string | null;
}

// ============================================================
// Result Types
// ============================================================

/**
 * Result from move_item_subtree_secure PostgreSQL function
 */
export interface MoveItemResult {
    success: boolean;
    item_id: string;
    item_name: string;
    old_path: string;
    new_path: string;
    descendants_moved: number;
    new_parent_id: string | null;
    workspace_id: string;
}

/**
 * Generic action result type for consistency
 */
export type ItemActionResult<T = Item> =
    | { success: true; data: T }
    | { success: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'UNKNOWN' };

/**
 * Query result for multiple items
 */
export type ItemsQueryResult =
    | { success: true; data: Item[]; count: number }
    | { success: false; error: string; code?: string };

// ============================================================
// Query Types
// ============================================================

/**
 * Sorting options for items
 */
export type ItemSortBy = 'name' | 'created_at' | 'updated_at' | 'path';

/**
 * Filters for querying items
 */
export interface ItemFilters {
    itemType?: ItemType;
    parentId?: string | null;  // null = root level only
    search?: string;
}

/**
 * Options for querying items
 */
export interface ItemQueryOptions {
    filters?: ItemFilters;
    sortBy?: ItemSortBy;
    sortDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
