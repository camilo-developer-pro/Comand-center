# Implementation Plan: createSiblingBlock Server Action

## Overview
This document outlines the implementation plan for the `createSiblingBlock` server action as part of Command Center V3.2 Phase 2. The function creates a new sibling block when the user presses Enter at the end of a TipTap block.

## Requirements Summary
- **File**: `src/lib/actions/block-actions.ts`
- **Function**: `createSiblingBlock`
- **Purpose**: Create new sibling block with fractional indexing
- **Phase**: V3.2 Phase 2 (Atomic Editor & Layout)

## Technical Specifications

### 1. Zod Schema
```typescript
const createSiblingBlockSchema = z.object({
  documentId: z.string().uuid(),
  previousBlockId: z.string().uuid(), // The block BEFORE the new one
  nextBlockId: z.string().uuid().nullable(), // The block AFTER (null if appending)
  type: z.enum(['paragraph', 'heading', 'bulletList', 'numberedList', 'taskItem', 'codeBlock']).default('paragraph'),
  content: z.any().default({ type: 'doc', content: [] }), // TipTap JSON
});
```

**Note**: Need to reconcile block type enum with existing `BlockTypeEnum` in `src/lib/schemas/block.schema.ts`.

### 2. Function Signature
```typescript
'use server';
export async function createSiblingBlock(
  input: z.infer<typeof createSiblingBlockSchema>
): Promise<ActionResult<{ id: string; sortOrder: string }>>
```

### 3. Required Imports
```typescript
import { z } from 'zod';
import { db } from '@/lib/db';
import { sql } from 'kysely';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { success, failure, type ActionResult } from './types';
import { generateUUIDv7 } from '@/lib/utils/uuid';
```

## Implementation Logic Flow

### Step 1: Validation
1. Validate input with Zod schema
2. Return `failure` with `VALIDATION_ERROR` if invalid

### Step 2: Authentication
1. Create Supabase client with `createServerSupabaseClient()`
2. Get authenticated user
3. Return `failure` with `UNAUTHORIZED` if no user

### Step 3: Fetch Neighbor Sort Orders
```typescript
const neighbors = await db
  .selectFrom('blocks')
  .select(['id', 'sort_order'])
  .where('id', 'in', [previousBlockId, nextBlockId].filter(Boolean))
  .execute();
```

### Step 4: Generate Fractional Index
```typescript
// Extract sort orders from neighbors
const prevOrder = previousBlockId ? neighbors.find(n => n.id === previousBlockId)?.sort_order : null;
const nextOrder = nextBlockId ? neighbors.find(n => n.id === nextBlockId)?.sort_order : null;

// Call PostgreSQL function
const { rows } = await db.executeQuery(
  sql`SELECT fi_generate_key_between(${prevOrder}, ${nextOrder}) AS new_key`.compile(db)
);
const newSortOrder = rows[0].new_key;
```

### Step 5: Insert New Block
```typescript
const newBlockId = generateUUIDv7();

const newBlock = await db
  .insertInto('blocks')
  .values({
    id: newBlockId,
    document_id: documentId,
    sort_order: newSortOrder,
    type: blockType,
    content: JSON.stringify(content),
    user_id: user.id,
    created_at: new Date(),
    updated_at: new Date(),
  })
  .returning(['id', 'sort_order'])
  .executeTakeFirstOrThrow();
```

### Step 6: Return Result
```typescript
return success({ 
  id: newBlock.id, 
  sortOrder: newBlock.sort_order 
});
```

## Error Handling Strategy

### Error Scenarios
1. **Validation Errors**: Invalid UUIDs, missing fields, invalid block type
2. **Authentication Errors**: No authenticated user
3. **Database Errors**: 
   - Neighbor blocks not found
   - `fi_generate_key_between` function errors
   - Unique constraint violations
   - Foreign key violations
4. **Application Errors**: Invalid prev/next order

### Error Codes
- `VALIDATION_ERROR`: Zod validation failed
- `UNAUTHORIZED`: Authentication failed
- `NOT_FOUND`: Neighbor block not found
- `DATABASE_ERROR`: Database operation failed
- `FRACTIONAL_INDEX_ERROR`: `fi_generate_key_between` failed

## Database Considerations

### Table: `blocks` (legacy)
Based on existing code analysis, the legacy `blocks` table likely contains:
- `id` (UUID primary key)
- `document_id` (UUID foreign key)
- `sort_order` (TEXT with COLLATE "C")
- `type` (TEXT)
- `content` (JSONB)
- `user_id` (UUID)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Function: `fi_generate_key_between`
- Already exists in database (verified)
- Takes two TEXT parameters (prev, next)
- Returns new fractional index key

## Testing Strategy

### Test Cases
1. **Happy Path**: Create sibling between two existing blocks
2. **Append to End**: `nextBlockId = null`
3. **Prepend to Beginning**: `previousBlockId = null`
4. **First Block**: Both neighbors null
5. **Error Cases**: Invalid UUIDs, authentication failure, missing blocks

### Sample Test Data
```typescript
const testCases = [
  {
    name: 'Insert between blocks',
    input: {
      documentId: '123e4567-e89b-12d3-a456-426614174000',
      previousBlockId: '123e4567-e89b-12d3-a456-426614174001',
      nextBlockId: '123e4567-e89b-12d3-a456-426614174002',
      type: 'paragraph' as const,
      content: { type: 'doc', content: [] }
    }
  },
  // ... more test cases
];
```

## Integration Points

### 1. Existing Codebase
- File: `src/lib/actions/block-actions.ts` (already exists)
- Pattern: Follow existing action patterns (e.g., `createBlockAction`)
- Error handling: Use existing `ActionResult` pattern

### 2. Dependencies
- Zod for validation
- Kysely for database operations
- Supabase for authentication
- UUIDv7 generation utility

### 3. Compatibility
- Works with legacy `blocks` table (not `blocks_v3`)
- Compatible with existing TipTap editor
- Follows fractional indexing standards

## Implementation Checklist

### Phase 1: Setup
- [ ] Add Zod schema to existing schemas or create inline
- [ ] Import required dependencies
- [ ] Define function signature

### Phase 2: Core Logic
- [ ] Implement authentication
- [ ] Add validation logic
- [ ] Implement neighbor sort order fetch
- [ ] Add fractional index generation
- [ ] Implement block insertion

### Phase 3: Error Handling
- [ ] Add validation error handling
- [ ] Add authentication error handling
- [ ] Add database error handling
- [ ] Add fractional index error handling

### Phase 4: Testing
- [ ] Create test cases
- [ ] Test happy paths
- [ ] Test error cases
- [ ] Test edge cases

### Phase 5: Integration
- [ ] Verify with existing codebase
- [ ] Test with TipTap editor
- [ ] Update documentation

## Potential Issues & Solutions

### Issue 1: Block Type Enum Mismatch
**Problem**: Required block types differ from existing `BlockTypeEnum`
**Solution**: Create new enum for this specific use case or map types

### Issue 2: Missing Database Columns
**Problem**: `blocks` table schema might differ from assumptions
**Solution**: Check generated types or database schema before implementation

### Issue 3: RLS Policies
**Problem**: Row-level security might block operations
**Solution**: Ensure user has proper permissions for document

### Issue 4: Transaction Management
**Problem**: Multiple database operations need atomicity
**Solution**: Consider wrapping in transaction if needed

## Success Criteria
1. Function exists in `src/lib/actions/block-actions.ts`
2. Zod validation rejects invalid UUIDs
3. User authentication is enforced
4. Uses `fi_generate_key_between` SQL function
5. Returns `ActionResult` with new block ID and sortOrder
6. Handles all error cases gracefully

## Timeline
This implementation should be completed in a single development session (2-4 hours) given the clear requirements and existing patterns to follow.

## Next Steps
1. Review this plan with stakeholders
2. Begin implementation in Code mode
3. Test thoroughly before deployment
4. Update project documentation

---
*Plan created: 2026-01-26*
*For: Command Center V3.2 Phase 2*
*Status: Ready for Implementation*