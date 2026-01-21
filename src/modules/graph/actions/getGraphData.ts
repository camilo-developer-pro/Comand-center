'use server';

import { createClient } from '@/lib/supabase/server';
import type { GraphData, GraphNode, GraphLink, GraphNeighborhoodResponse } from '../types';

/**
 * Fetch the initial graph overview for a workspace.
 * If nodes > maxNodes, returns only cluster headers (items with most connections).
 */
export async function getWorkspaceGraphOverview(
    workspaceId: string,
    maxNodes: number = 1000
): Promise<GraphData> {
    const supabase = await createClient();

    // First, count total nodes
    const { count: totalNodes } = await supabase
        .from('entity_edges')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

    if ((totalNodes ?? 0) > maxNodes) {
        // Return cluster headers only - nodes with most connections
        const { data: topNodes, error } = await supabase
            .rpc('get_top_connected_nodes', {
                ws_id: workspaceId,
                limit_count: Math.floor(maxNodes / 2)
            });

        if (error) throw new Error(`Failed to fetch graph overview: ${error.message}`);

        // Format for react-force-graph
        return formatGraphData(topNodes ?? []);
    }

    // Load full graph
    const { data, error } = await supabase
        .rpc('get_full_workspace_graph', { ws_id: workspaceId });

    if (error) throw new Error(`Failed to fetch workspace graph: ${error.message}`);

    return formatGraphData(data ?? []);
}

/**
 * Fetch immediate neighbors of a specific node (Focus Mode).
 */
export async function getNodeNeighborhood(
    nodeId: string,
    workspaceId: string,
    depth: number = 1
): Promise<GraphNeighborhoodResponse> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .rpc('get_graph_neighborhood', {
            node_id: nodeId,
            depth: depth,
            ws_id: workspaceId
        });

    if (error) throw new Error(`Failed to fetch neighborhood: ${error.message}`);

    const graphData = formatGraphData(data ?? []);

    return {
        ...graphData,
        totalNodes: graphData.nodes.length,
        hasMore: depth < 3 // Allow expansion up to depth 3
    };
}

/**
 * Format raw database response to react-force-graph structure.
 */
function formatGraphData(rawData: any[]): GraphData {
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    for (const edge of rawData) {
        // Add source node
        if (!nodesMap.has(edge.source_id)) {
            nodesMap.set(edge.source_id, {
                id: edge.source_id,
                name: edge.source_name || 'Unknown',
                type: edge.source_type,
                val: 1
            });
        }

        // Add target node
        if (!nodesMap.has(edge.target_id)) {
            nodesMap.set(edge.target_id, {
                id: edge.target_id,
                name: edge.target_name || 'Unknown',
                type: edge.target_type,
                val: 1
            });
        }

        // Add link
        links.push({
            source: edge.source_id,
            target: edge.target_id,
            relation: edge.relation_type,
            properties: edge.properties
        });
    }

    // Calculate node importance (val) based on connection count
    for (const link of links) {
        const sourceNode = nodesMap.get(link.source);
        const targetNode = nodesMap.get(link.target);
        if (sourceNode) sourceNode.val = (sourceNode.val || 1) + 1;
        if (targetNode) targetNode.val = (targetNode.val || 1) + 1;
    }

    return {
        nodes: Array.from(nodesMap.values()),
        links
    };
}
