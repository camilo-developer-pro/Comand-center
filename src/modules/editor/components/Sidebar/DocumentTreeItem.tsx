'use client';

import { ChevronRight, FileText, Folder } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DocumentTreeNodeWithChildren } from './useSidebarTree';

interface DocumentTreeItemProps {
  node: DocumentTreeNodeWithChildren;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (id: string) => void;
}

export function DocumentTreeItem({
  node,
  depth,
  expandedIds,
  onToggle,
  onSelect
}: DocumentTreeItemProps) {
  const params = useParams();
  const isActive = params.id === node.id;
  const isExpanded = expandedIds.has(node.id);
  
  const handleClick = () => {
    if (onSelect) {
      onSelect(node.id);
    }
  };
  
  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
          'hover:bg-accent cursor-pointer',
          isActive && 'bg-accent text-accent-foreground',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Button */}
        {node.hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="p-0.5 hover:bg-muted rounded"
          >
            <ChevronRight
              className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="w-5" /> // Spacer for alignment
        )}
        
        {/* Icon */}
        {node.icon ? (
          <span className="text-base">{node.icon}</span>
        ) : node.hasChildren ? (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        
        {/* Title Link */}
        <Link
          href={`/documents/${node.id}`}
          className="flex-1 truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {node.title || 'Untitled'}
        </Link>
      </div>
      
      {/* Recursive Children */}
      {isExpanded && node.children?.map(child => (
        <DocumentTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}