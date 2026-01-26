'use client';

import { useSidebarTree } from './useSidebarTree';
import { DocumentTreeItem } from './DocumentTreeItem';
import { Skeleton } from '@/components/ui/skeleton';

export interface DocumentTreeProps {
  workspaceId: string;
  onSelect?: (documentId: string) => void;
}

export function DocumentTree({ workspaceId, onSelect }: DocumentTreeProps) {
  const { tree, expandedIds, toggleExpanded, isLoading } = useSidebarTree(workspaceId);
  
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  
  if (!tree || tree.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No documents found
      </div>
    );
  }
  
  return (
    <nav className="space-y-1 p-2">
      {tree.map(node => (
        <DocumentTreeItem
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          onToggle={toggleExpanded}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}