'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { SortableBlockWrapper } from './SortableBlockWrapper';
import { moveDocument, getDocumentTree } from '@/lib/actions/document-actions';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

export interface DocumentTreeProps {
  workspaceId: string;
  selectedId?: string;
  onSelect?: (documentId: string) => void;
}

interface TreeNode {
  id: string;
  title: string;
  parentId: string | null;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  depth: number;
}

export function DocumentTree({
  workspaceId,
  selectedId,
  onSelect,
}: DocumentTreeProps) {
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documentTree', workspaceId],
    queryFn: async () => {
      const result = await getDocumentTree(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
  
  const moveMutation = useMutation({
    mutationFn: async ({
      documentId,
      newParentId,
    }: {
      documentId: string;
      newParentId: string | null;
    }) => {
      const result = await moveDocument({
        documentId,
        newParentId,
        workspaceId,
      });
      
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onMutate: async ({ documentId, newParentId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['documentTree', workspaceId] });
      
      // Snapshot the previous value
      const previousDocuments = queryClient.getQueryData(['documentTree', workspaceId]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['documentTree', workspaceId], (old: typeof documents) => {
        if (!old) return old;
        
        return old.map((doc) => {
          if (doc.id === documentId) {
            return { ...doc, parentId: newParentId };
          }
          return doc;
        });
      });
      
      // Return a context object with the snapshotted value
      return { previousDocuments };
    },
    onSuccess: () => {
      toast.success('Document moved');
    },
    onError: (error, variables, context) => {
      // Rollback to the previous value
      if (context?.previousDocuments) {
        queryClient.setQueryData(['documentTree', workspaceId], context.previousDocuments);
      }
      toast.error(error instanceof Error ? error.message : 'Failed to move document');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['documentTree', workspaceId] });
    },
  });
  
  // Build tree structure from flat list
  const buildTree = useCallback((docs: typeof documents): TreeNode[] => {
    if (!docs) return [];
    
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    
    // Create all nodes
    docs.forEach((doc) => {
      nodeMap.set(doc.id, {
        ...doc,
        children: [],
        depth: doc.path.split('.').length - 1,
      });
    });
    
    // Build hierarchy
    docs.forEach((doc) => {
      const node = nodeMap.get(doc.id)!;
      
      if (doc.parentId) {
        const parent = nodeMap.get(doc.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });
    
    // Sort children by path depth and title
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.title.localeCompare(b.title);
      });
      node.children.forEach(sortChildren);
    };
    
    roots.forEach(sortChildren);
    return roots;
  }, []);
  
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;
    
    // Determine new parent
    const overId = over.id as string;
    const activeDoc = documents?.find((d) => d.id === active.id);
    const overDoc = documents?.find((d) => d.id === overId);
    
    if (!activeDoc || !overDoc) return;
    
    // If dropping on a folder, make it the parent
    // Otherwise, make it a sibling (same parent)
    const newParentId = overDoc.isFolder ? overId : overDoc.parentId;
    
    if (activeDoc.parentId !== newParentId) {
      moveMutation.mutate({
        documentId: active.id as string,
        newParentId,
      });
    }
  }, [documents, moveMutation]);
  
  const renderNode = useCallback(
    (node: TreeNode) => {
      const isExpanded = expandedIds.has(node.id);
      const hasChildren = node.children.length > 0;
      const isSelected = node.id === selectedId;
      
      return (
        <div key={node.id}>
          <SortableBlockWrapper id={node.id}>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                isSelected && 'bg-blue-50 dark:bg-blue-900/30'
              )}
              style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
              onClick={() => {
                if (node.isFolder) {
                  toggleExpand(node.id);
                } else {
                  onSelect?.(node.id);
                }
              }}
            >
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              )}
              {!hasChildren && <span className="w-4" />}
              
              {node.isFolder ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Folder className="h-4 w-4 text-yellow-500" />
                )
              ) : (
                <FileText className="h-4 w-4 text-gray-500" />
              )}
              
              <span className="truncate text-sm">{node.title}</span>
            </div>
          </SortableBlockWrapper>
          
          {isExpanded && node.children.length > 0 && (
            <div>{node.children.map(renderNode)}</div>
          )}
        </div>
      );
    },
    [expandedIds, selectedId, toggleExpand, onSelect]
  );
  
  const tree = buildTree(documents);
  
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  
  if (!documents || documents.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No documents found
      </div>
    );
  }
  
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={documents?.map((d) => d.id) ?? []}
        strategy={verticalListSortingStrategy}
      >
        <div className="py-2">{tree.map(renderNode)}</div>
      </SortableContext>
      
      <DragOverlay>
        {activeId && documents && (
          <div className="bg-white dark:bg-gray-900 shadow-lg rounded-md px-3 py-2 text-sm">
            {documents.find((d) => d.id === activeId)?.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}