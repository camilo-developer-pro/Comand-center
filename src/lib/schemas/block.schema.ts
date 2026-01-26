/**
 * Zod Schemas for Block Types
 * 
 * Every block mutation must be validated at runtime. These Zod schemas define the contract
 * between the editor (TipTap), the database, and the API layer.
 * 
 * IMPORTANT: BlockTypeEnum must match the PostgreSQL block_type ENUM exactly.
 */

import { z } from 'zod';

// ============================================================================
// 1. Block Type Enum (matches PostgreSQL ENUM exactly)
// ============================================================================
export const BlockTypeEnum = z.enum([
  'page',
  'text',
  'heading',
  'task',
  'code',
  'quote',
  'divider',
  'image',
  'table',
]);
export type BlockType = z.infer<typeof BlockTypeEnum>;

// ============================================================================
// 2. TipTap Content Schema (flexible JSONB)
// ============================================================================
export const TipTapContentSchema = z.object({
  type: z.string(),
  content: z.array(z.any()).optional(),
  attrs: z.record(z.string(), z.any()).optional(),
  marks: z.array(z.any()).optional(),
  text: z.string().optional(),
}).passthrough(); // Allow TipTap extensions

export type TipTapContent = z.infer<typeof TipTapContentSchema>;

// Helper function for UUID validation in Zod schemas
const uuidSchema = z.string().refine(
  (val) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  },
  {
    message: 'Invalid UUID format',
  }
);

// ============================================================================
// 3. Block Base Schema
// ============================================================================
export const BlockBaseSchema = z.object({
  // Primary Key: UUIDv7 for time-sortable, globally unique identifiers
  id: uuidSchema,
  
  // Workspace Isolation: Multi-tenant security boundary
  workspace_id: uuidSchema,
  
  // User Context: Who created/owns this block
  user_id: uuidSchema,
  
  // Dual-Path Hierarchy Strategy
  // Simple parent lookup for immediate children
  parent_id: uuidSchema.nullable(),
  
  // Efficient ancestor/descendant queries using ltree operators (@>, <@)
  // Format: {workspace_uuid_no_hyphens}.{block_uuid_no_hyphens} for root blocks
  //         parent_path || child_uuid_no_hyphens for nested blocks
  path: z.string().regex(/^[a-z0-9]+(\.[a-z0-9]+)*$/i, 'Invalid ltree path'),
  
  // Block Type: ENUM for type-safe validation
  type: BlockTypeEnum,
  
  // Fractional Indexing: Zero-latency reordering with COLLATE "C"
  sort_order: z.string().min(1),
  
  // Content Storage: TipTap JSON structure
  content: TipTapContentSchema,
  
  // Embedding Column: OpenAI text-embedding-3-small (1536 dimensions)
  // Note: This is optional in the schema but may be present in database
  embedding: z.array(z.number()).length(1536).optional(),
  
  // Timestamps: Created and updated tracking
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Block = z.infer<typeof BlockBaseSchema>;

// ============================================================================
// 4. Insert Schema (omit computed fields)
// ============================================================================
export const BlockInsertSchema = BlockBaseSchema.omit({
  path: true,          // Computed by database trigger
  created_at: true,    // Set by database DEFAULT
  updated_at: true,    // Set by database trigger
  embedding: true,     // Generated asynchronously
}).extend({
  // Auto-generated if not provided (database will generate UUIDv7)
  id: uuidSchema.optional(),
}).strict(); // Reject any unknown fields including path

export type BlockInsert = z.infer<typeof BlockInsertSchema>;

// ============================================================================
// 5. Update Schema (partial, require ID)
// ============================================================================
export const BlockUpdateSchema = BlockBaseSchema
  .partial()
  .required({ id: true })
  .refine(
    (data) => {
      // Prevent updating computed fields directly
      const disallowedFields = ['path', 'created_at'];
      return !disallowedFields.some(field => field in data && data[field as keyof typeof data] !== undefined);
    },
    {
      message: 'Cannot directly update path or created_at fields',
      path: ['path', 'created_at'],
    }
  );

export type BlockUpdate = z.infer<typeof BlockUpdateSchema>;

// ============================================================================
// 6. Reorder Schema (for drag-drop operations)
// ============================================================================
export const BlockReorderSchema = z.object({
  block_id: uuidSchema,
  new_parent_id: uuidSchema.nullable(),
  prev_sort_order: z.string().nullable(),
  next_sort_order: z.string().nullable(),
});

export type BlockReorder = z.infer<typeof BlockReorderSchema>;

// ============================================================================
// 7. Batch Operations Schema
// ============================================================================
export const BatchBlockInsertSchema = z.object({
  workspace_id: uuidSchema,
  blocks: z.array(BlockInsertSchema),
});

export type BatchBlockInsert = z.infer<typeof BatchBlockInsertSchema>;

export const BatchBlockUpdateSchema = z.object({
  updates: z.array(BlockUpdateSchema),
});

export type BatchBlockUpdate = z.infer<typeof BatchBlockUpdateSchema>;

// ============================================================================
// 8. Validation Helper Functions
// ============================================================================

/**
 * Validate a UUID string
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate an ltree path string
 */
export function isValidLtreePath(path: string): boolean {
  return /^[a-z0-9]+(\.[a-z0-9]+)*$/i.test(path);
}

/**
 * Extract UUIDs from an ltree path
 */
export function extractUUIDsFromPath(path: string): string[] {
  if (!isValidLtreePath(path)) {
    throw new Error(`Invalid ltree path: ${path}`);
  }
  
  // Split by dots and convert labels back to UUID format
  return path.split('.').map(label => {
    // Convert from ltree label (no hyphens) back to UUID format
    if (label.length === 32) {
      // Assuming it's a UUID without hyphens
      return [
        label.slice(0, 8),
        label.slice(8, 12),
        label.slice(12, 16),
        label.slice(16, 20),
        label.slice(20, 32),
      ].join('-');
    }
    // If not 32 chars, might be workspace UUID or other identifier
    return label;
  });
}

/**
 * Create an ltree path from UUIDs
 */
export function createLtreePath(uuids: string[], workspaceFirst: boolean = true): string {
  const labels = uuids.map(uuid => {
    if (isValidUUID(uuid)) {
      // Remove hyphens for ltree compatibility
      return uuid.replace(/-/g, '');
    }
    return uuid;
  });
  
  const path = labels.join('.');
  
  // Validate the created path
  if (!isValidLtreePath(path)) {
    throw new Error(`Created invalid ltree path: ${path}`);
  }
  
  return path;
}

// ============================================================================
// 9. Schema Export
// ============================================================================
export default {
  BlockTypeEnum,
  TipTapContentSchema,
  BlockBaseSchema,
  BlockInsertSchema,
  BlockUpdateSchema,
  BlockReorderSchema,
  BatchBlockInsertSchema,
  BatchBlockUpdateSchema,
};