'use client';

import { useSidebarTree } from './useSidebarTree';
import { SidebarNode } from './SidebarNode';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarTreeProps {
  workspaceId: string;
  activeBlockId: string | null;
  onBlockSelect: (blockId: string) => void;
}

export function SidebarTree({
  workspaceId,
  activeBlockId,
  onBlockSelect,
}: SidebarTreeProps) {
  const { tree, isLoading, toggleExpand } = useSidebarTree(workspaceId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <nav className="p-2" aria-label="Document navigation">
      {tree.map((node) => (
        <SidebarNode
          key={node.block.id}
          node={node}
          activeId={activeBlockId}
          onSelect={onBlockSelect}
          onToggle={toggleExpand}
        />
      ))}
    </nav>
  );
}