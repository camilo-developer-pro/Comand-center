# BlockID Extension Implementation Plan

## Current Analysis
The BlockIDExtension.ts file exists but needs updates to match V3.1 requirements:

### Issues Identified:
1. **Uses `uuid` package** instead of project's `generateUUIDv7()` from `@/lib/utils`
2. **Attribute name mismatch**: Uses `id` instead of `blockId` (database mapping requires `blockId`)
3. **HTML data attribute**: Uses `data-id` instead of `data-block-id`
4. **Missing TypeScript options interface**: No `BlockIDOptions` interface
5. **Missing type definitions**: Need `block.types.ts` with `BlockNode` and `BlockSyncPayload`
6. **Missing tests**: No test suite for the extension
7. **Missing barrel export**: No `index.ts` in extensions directory

## Required Changes

### 1. Update BlockIDExtension.ts
```typescript
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { generateUUIDv7 } from '@/lib/utils';

export interface BlockIDOptions {
  types: string[]; // Node types to track (paragraph, heading, bulletList, etc.)
}

export const BlockIDExtension = Extension.create<BlockIDOptions>({
  name: 'blockId',
  
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'codeBlock', 'blockquote'],
    };
  },
  
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) => {
              if (!attributes.blockId) return {};
              return { 'data-block-id': attributes.blockId };
            },
          },
        },
      },
    ];
  },
  
  onCreate() {
    this.editor.state.doc.descendants((node, pos) => {
      if (this.options.types.includes(node.type.name) && !node.attrs.blockId) {
        this.editor.commands.updateAttributes(node.type.name, { blockId: generateUUIDv7() });
      }
    });
  },

  addProseMirrorPlugins() {
    const { types } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('blockIdGenerator'),
        appendTransaction: (transactions, oldState, newState) => {
          // Only process if document changed
          if (!transactions.some(tr => tr.docChanged)) return null;
          
          const tr = newState.tr;
          let modified = false;
          
          newState.doc.descendants((node, pos) => {
            if (types.includes(node.type.name) && !node.attrs.blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: generateUUIDv7(),
              });
              modified = true;
            }
          });
          
          return modified ? tr : null;
        },
      }),
    ];
  },
});
```

### 2. Create block.types.ts
Location: `src/modules/editor/types/block.types.ts`
```typescript
export interface BlockNode {
  blockId: string;
  type: string;
  content: Record<string, unknown>;
  sortOrder: string;
  parentPath: string;
}

export interface BlockSyncPayload {
  documentId: string;
  blocks: BlockNode[];
  deletedBlockIds: string[];
}
```

### 3. Create Test Suite
Location: `src/modules/editor/extensions/__tests__/BlockIDExtension.test.ts`
Tests needed:
- New paragraphs receive UUIDv7 on creation
- Existing blockIds are preserved on edit
- All configured node types receive IDs
- UUIDv7 format validation (time-ordered, 36 chars with hyphens)
- Copy-pasting content generates NEW blockIds for pasted nodes

### 4. Create Barrel Export
Location: `src/modules/editor/extensions/index.ts`
```typescript
export { BlockIDExtension } from './BlockIDExtension';
export { FractionalIndexExtension } from './FractionalIndexExtension';
```

## Acceptance Criteria Verification
- [ ] Every new paragraph has a unique UUIDv7 in `attrs.blockId`
- [ ] Editing existing text does NOT change the blockId
- [ ] Copy-pasting content generates NEW blockIds for pasted nodes
- [ ] TypeScript strict mode passes with no errors

## Implementation Order
1. Switch to Code mode
2. Update BlockIDExtension.ts
3. Create block.types.ts
4. Create test suite
5. Create barrel export
6. Run tests and verify TypeScript compilation
7. Review acceptance criteria