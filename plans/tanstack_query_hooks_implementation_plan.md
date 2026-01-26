# TanStack Query Hooks Implementation Plan

## Task Overview
Create TanStack Query hooks for fetching document blocks and creating sibling blocks with optimistic UI.

## File to Create
`src/modules/editor/hooks/useDocumentBlocks.ts`

## Requirements Analysis

### 1. Data Source Consistency
- **`createSiblingBlock`** (implemented) uses **`blocks`** table (legacy)
- **`getBlocksByDocumentId`** (in `blocks.ts`) uses **`blocks`** table
- **`getDocumentBlocks`** (in `block-actions.ts`) uses **`blocks_v3`** table (inconsistent)

**Decision**: Use `getBlocksByDocumentId` for consistency with `createSiblingBlock`.

### 2. Block Interface
Database schema (`blocks` table):
```typescript
interface Blocks {
  id: Generated<string>;
  document_id: string;
  type: string;
  content: Generated<Json>;
  sort_order: string;
  parent_path: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  // ... other fields
}
```

Required `Block` interface:
```typescript
export interface Block {
  id: string;
  documentId: string;
  type: string;
  content: unknown; // TipTap JSON
  sortOrder: string;
  parentPath: string;
  createdAt: string;
  updatedAt: string;
}
```

**Transformation needed**: snake_case → camelCase

### 3. Query Key Conflicts
Existing `useBlockSync.ts` already exports:
- `blockKeys` object
- `useDocumentBlocks` function
- `useSyncBlocks` function

**Decision**: Create new query keys with different naming to avoid conflicts, or use the same keys if they're meant to be shared.

## Implementation Plan

### Phase 1: Data Transformation Utilities
Create helper functions for:
1. Snake case to camel case transformation
2. Database block to frontend block conversion
3. Reverse transformation for mutations

### Phase 2: Query Hook Implementation
```typescript
// Query keys (avoid conflict with existing)
export const documentBlockKeys = {
  all: ['documentBlocks'] as const,
  lists: () => [...documentBlockKeys.all, 'list'] as const,
  list: (documentId: string) => [...documentBlockKeys.lists(), documentId] as const,
};

export function useDocumentBlocks(documentId: string | null) {
  return useQuery({
    queryKey: documentBlockKeys.list(documentId || ''),
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required');
      
      // Need to call appropriate server action
      // Options:
      // 1. Create new server action getBlocksByDocument
      // 2. Use existing getDocumentBlocks (but it uses blocks_v3)
      // 3. Use getBlocksByDocumentId directly (needs to be exposed)
    },
    enabled: !!documentId,
    staleTime: 30_000,
  });
}
```

### Phase 3: Mutation Hook with Optimistic UI
```typescript
export function useCreateSiblingBlock(documentId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSiblingBlock,
    
    onMutate: async (newBlockInput) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: documentBlockKeys.list(documentId) });
      
      // Snapshot previous blocks
      const previousBlocks = queryClient.getQueryData<Block[]>(documentBlockKeys.list(documentId));
      
      // Generate optimistic sort order
      const prevBlock = previousBlocks?.find(b => b.id === newBlockInput.previousBlockId);
      const nextBlock = previousBlocks?.find(b => b.id === newBlockInput.nextBlockId);
      const optimisticSortOrder = generateKeyBetween(
        prevBlock?.sortOrder ?? null,
        nextBlock?.sortOrder ?? null
      );
      
      // Create optimistic block
      const optimisticId = `temp-${Date.now()}`;
      const optimisticBlock: Block = {
        id: optimisticId,
        documentId,
        type: newBlockInput.type,
        content: newBlockInput.content,
        sortOrder: optimisticSortOrder,
        parentPath: 'root',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Update cache
      const updatedBlocks = [...(previousBlocks || []), optimisticBlock]
        .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
      queryClient.setQueryData(documentBlockKeys.list(documentId), updatedBlocks);
      
      return { previousBlocks, optimisticId };
    },
    
    onSuccess: (result, variables, context) => {
      // Replace optimistic block with real data
      const blocks = queryClient.getQueryData<Block[]>(documentBlockKeys.list(documentId));
      if (blocks && context?.optimisticId) {
        const updated = blocks.map(b => 
          b.id === context.optimisticId 
            ? { ...b, id: result.id, sortOrder: result.sortOrder }
            : b
        );
        queryClient.setQueryData(documentBlockKeys.list(documentId), updated);
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBlocks) {
        queryClient.setQueryData(documentBlockKeys.list(documentId), context.previousBlocks);
      }
      toast.error('Failed to create block');
    },
  });
}
```

### Phase 4: Server Action Integration
Need to either:
1. **Create new server action** `getBlocksByDocument` that uses `blocks` table
2. **Modify existing** `getDocumentBlocks` to use `blocks` table instead of `blocks_v3`
3. **Expose** `getBlocksByDocumentId` as a server action

**Recommendation**: Create new server action `getBlocksByDocument` in `block-actions.ts` that uses `getBlocksByDocumentId`.

### Phase 5: Testing & Validation
1. Test query hook fetches and transforms data correctly
2. Test mutation hook provides optimistic UI
3. Test error handling and rollback
4. Verify TypeScript compatibility

## Open Questions
1. Should we rename the existing `useDocumentBlocks` in `useBlockSync.ts`?
2. How to handle the `blocks` vs `blocks_v3` table inconsistency?
3. Should query keys be shared or separate?

## Next Steps
1. Create data transformation utilities
2. Implement server action for fetching blocks from `blocks` table
3. Implement query hook with proper data transformation
4. Implement mutation hook with optimistic UI
5. Test integration