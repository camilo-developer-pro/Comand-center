import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Block } from '@/lib/schemas/block.schema';
import { useState, useMemo, useCallback } from 'react';

export interface SidebarNode {
  block: Block;
  children: SidebarNode[];
  depth: number;
  isExpanded: boolean;
}

function buildTree(
  blocks: Block[],
  expandedIds: Set<string>
): SidebarNode[] {
  const blockMap = new Map<string, SidebarNode>();
  const roots: SidebarNode[] = [];

  // First pass: create nodes
  blocks.forEach((block) => {
    blockMap.set(block.id, {
      block,
      children: [],
      depth: block.path.split('.').length - 1,
      isExpanded: expandedIds.has(block.id),
    });
  });

  // Second pass: build hierarchy
  blocks.forEach((block) => {
    const node = blockMap.get(block.id)!;
    if (block.parent_id && blockMap.has(block.parent_id)) {
      blockMap.get(block.parent_id)!.children.push(node);
    } else if (!block.parent_id) {
      roots.push(node);
    }
  });

  // Sort children by sort_order
  const sortChildren = (nodes: SidebarNode[]) => {
    nodes.sort((a, b) => a.block.sort_order.localeCompare(b.block.sort_order));
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

export function useSidebarTree(workspaceId: string) {
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['sidebar-blocks', workspaceId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('blocks_v3')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('type', ['page']) // Only page type blocks for sidebar navigation
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      // Cast to Block[] - the database types should match our schema
      return data as unknown as Block[];
    },
    staleTime: 30_000, // 30 seconds
  });

  const tree = useMemo(
    () => (blocks ? buildTree(blocks, expandedIds) : []),
    [blocks, expandedIds]
  );

  const toggleExpand = useCallback((blockId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  return { tree, isLoading, toggleExpand, expandedIds };
}