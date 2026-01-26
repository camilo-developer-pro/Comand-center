'use client';

import { memo } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarNode as SidebarNodeType } from './useSidebarTree';

interface SidebarNodeProps {
  node: SidebarNodeType;
  activeId: string | null;
  onSelect: (blockId: string) => void;
  onToggle: (blockId: string) => void;
}

export const SidebarNode = memo(function SidebarNode({
  node,
  activeId,
  onSelect,
  onToggle,
}: SidebarNodeProps) {
  const hasChildren = node.children.length > 0;
  const isActive = node.block.id === activeId;
  const Icon = node.block.type === 'page' ? File : Folder;

  return (
    <div>
      <button
        onClick={() => onSelect(node.block.id)}
        className={cn(
          'flex items-center w-full px-2 py-1.5 text-sm rounded-md',
          'hover:bg-accent transition-colors',
          isActive && 'bg-accent text-accent-foreground',
        )}
        style={{ paddingLeft: `${(node.depth + 1) * 12}px` }}
        aria-label={`Select ${node.block.content?.title || 'Untitled'}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {hasChildren && (
          <ChevronRight
            className={cn(
              'h-4 w-4 mr-1 transition-transform',
              node.isExpanded && 'rotate-90',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.block.id);
            }}
            aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
          />
        )}
        {!hasChildren && <span className="w-5" />}
        <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
        <span className="truncate">
          {(node.block.content as any)?.title || 'Untitled'}
        </span>
      </button>
      
      {/* RECURSIVE RENDER */}
      {node.isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <SidebarNode
              key={child.block.id}
              node={child}
              activeId={activeId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});