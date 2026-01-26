'use client';

import { useQuery } from '@tanstack/react-query';
import { getDocumentTree } from '@/lib/actions/document-actions';
import { useState, useCallback, useMemo } from 'react';
import { DocumentTreeNode } from '@/lib/actions/document-actions';

export const sidebarKeys = {
  tree: (workspaceId: string) => ['sidebar', 'tree', workspaceId] as const,
};

export interface DocumentTreeNodeWithChildren extends DocumentTreeNode {
  children: DocumentTreeNodeWithChildren[];
}

export function useSidebarTree(workspaceId: string) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const query = useQuery({
    queryKey: sidebarKeys.tree(workspaceId),
    queryFn: async () => {
      const result = await getDocumentTree(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!workspaceId,
    staleTime: 60_000, // 1 minute
  });
  
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  // Build tree structure from flat array
  const tree = useMemo(() => {
    if (!query.data) return [];
    
    const nodes = query.data;
    const rootNodes = nodes.filter(n => n.parentId === null);
    
    const getChildren = (parentId: string): DocumentTreeNodeWithChildren[] => {
      return nodes
        .filter(n => n.parentId === parentId)
        .map(node => ({
          ...node,
          children: node.hasChildren ? getChildren(node.id) : [],
        }));
    };
    
    return rootNodes.map(node => ({
      ...node,
      children: node.hasChildren ? getChildren(node.id) : [],
    }));
  }, [query.data]);
  
  return {
    tree,
    expandedIds,
    toggleExpanded,
    isLoading: query.isLoading,
    error: query.error,
  };
}