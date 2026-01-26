# Sidebar Components for Document Tree

This directory contains components for displaying a recursive document tree in the sidebar.

## Components

### `DocumentTree`
The main container component that fetches and displays the document tree.

**Props:**
- `workspaceId: string` (required) - The workspace ID to fetch documents for
- `onSelect?: (documentId: string) => void` (optional) - Callback when a document is selected

**Usage:**
```tsx
import { DocumentTree } from './Sidebar';

function MySidebar() {
  const workspaceId = 'workspace-123'; // Get from context or props
  
  return (
    <div className="w-64 border-r">
      <DocumentTree 
        workspaceId={workspaceId}
        onSelect={(documentId) => console.log('Selected:', documentId)}
      />
    </div>
  );
}
```

### `DocumentTreeItem`
Recursive component that renders individual tree items with proper indentation, expand/collapse buttons, and navigation links.

**Props:**
- `node: DocumentTreeNodeWithChildren` (required) - The tree node to render
- `depth: number` (required) - Current depth in the tree (0 for root)
- `expandedIds: Set<string>` (required) - Set of expanded node IDs
- `onToggle: (id: string) => void` (required) - Callback to toggle expand/collapse
- `onSelect?: (id: string) => void` (optional) - Callback when item is selected

### `useSidebarTree`
Custom React hook that manages document tree fetching and expanded state.

**Returns:**
```typescript
{
  tree: DocumentTreeNodeWithChildren[]; // Hierarchical tree structure
  expandedIds: Set<string>; // Currently expanded node IDs
  toggleExpanded: (id: string) => void; // Function to toggle expand/collapse
  isLoading: boolean; // Loading state
  error: Error | null; // Error state
}
```

**Usage:**
```tsx
import { useSidebarTree } from './Sidebar';

function MyComponent({ workspaceId }: { workspaceId: string }) {
  const { tree, expandedIds, toggleExpanded, isLoading } = useSidebarTree(workspaceId);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {tree.map(node => (
        <DocumentTreeItem
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          onToggle={toggleExpanded}
        />
      ))}
    </div>
  );
}
```

## Features

1. **Recursive Tree Display**: Automatically builds hierarchical tree from flat document array
2. **Expand/Collapse**: Chevron buttons for folders with smooth rotation animation
3. **Proper Indentation**: Visual hierarchy with `depth * 12 + 8px` padding
4. **Active State Highlighting**: Current document is highlighted with accent background
5. **Loading States**: Skeleton loaders during data fetching
6. **Type Safety**: Full TypeScript support with proper interfaces
7. **Navigation**: Links to `/documents/[id]` routes
8. **Workspace Isolation**: Multi-tenant security built-in

## Integration with Existing Sidebar

To integrate with the existing `src/components/layout/Sidebar.tsx`, replace the `ItemTree` component with `DocumentTree`:

```tsx
// In src/components/layout/Sidebar.tsx
import { DocumentTree } from '@/modules/editor/components/Sidebar';

// Replace:
// <ItemTree workspaceId={workspaceId} activeItemId={activeDocumentId} />

// With:
<DocumentTree 
  workspaceId={workspaceId}
  onSelect={(documentId) => {
    // Optional: handle selection
  }}
/>
```

## Data Flow

1. `DocumentTree` calls `useSidebarTree(workspaceId)`
2. `useSidebarTree` fetches data using `getDocumentTree(workspaceId)` server action
3. Flat document array is transformed into hierarchical tree structure
4. Tree is rendered recursively with `DocumentTreeItem` components
5. User interactions (expand/collapse, selection) update local state

## Type Definitions

See `src/lib/actions/document-actions.ts` for the `DocumentTreeNode` interface.