'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Force Graph MUST be loaded client-side only
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-slate-200" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
        </div>
    ),
});

import type { NeuralGraphProps, FocusModeState, GraphNode, GraphData } from '../types';
import { NODE_COLORS, DEFAULT_GRAPH_CONFIG } from '../types';
import { getWorkspaceGraphOverview, getNodeNeighborhood } from '../actions/getGraphData';

export function NeuralGraph({
    workspaceId,
    initialNodeId,
    onNodeClick,
    onNodeHover,
    maxInitialNodes = 1000,
}: NeuralGraphProps) {
    const router = useRouter();
    const graphRef = useRef<any>(null);

    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [focusMode, setFocusMode] = useState<FocusModeState>({
        focusedNodeId: initialNodeId ?? null,
        depth: 1,
        isLoading: false,
    });

    // Track loaded node IDs to prevent duplicates
    const loadedNodeIds = useRef(new Set<string>());

    // Initial load - respect maxInitialNodes threshold
    useEffect(() => {
        async function loadInitialGraph() {
            try {
                setIsLoading(true);

                if (initialNodeId) {
                    // Start with focus mode on specific node
                    const response = await getNodeNeighborhood(initialNodeId, workspaceId, 1);
                    setGraphData({ nodes: response.nodes, links: response.links });
                    response.nodes.forEach(n => loadedNodeIds.current.add(n.id));
                } else {
                    // Load overview (respects maxInitialNodes internally)
                    const data = await getWorkspaceGraphOverview(workspaceId, maxInitialNodes);
                    setGraphData(data);
                    data.nodes.forEach(n => loadedNodeIds.current.add(n.id));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load graph');
            } finally {
                setIsLoading(false);
            }
        }

        loadInitialGraph();
    }, [workspaceId, initialNodeId, maxInitialNodes]);

    const handleNodeClick = useCallback(async (node: GraphNode) => {
        // External callback
        onNodeClick?.(node);

        // Enter focus mode - load neighbors
        if (focusMode.focusedNodeId === node.id) {
            // Already focused - navigate to document
            if (node.type === 'document') {
                router.push(`/documents/${node.id}`);
            }
            return;
        }

        setFocusMode(prev => ({ ...prev, focusedNodeId: node.id, isLoading: true }));

        try {
            const response = await getNodeNeighborhood(node.id, workspaceId, 1);

            // Merge new nodes with existing (avoid duplicates)
            setGraphData(prev => {
                const newNodes = response.nodes.filter(n => !loadedNodeIds.current.has(n.id));
                const newLinks = response.links.filter(l =>
                    !prev.links.some(pl =>
                        pl.source === (typeof l.source === 'object' ? (l.source as any).id : l.source) &&
                        pl.target === (typeof l.target === 'object' ? (l.target as any).id : l.target) &&
                        pl.relation === l.relation
                    )
                );

                newNodes.forEach(n => loadedNodeIds.current.add(n.id));

                return {
                    nodes: [...prev.nodes, ...newNodes],
                    links: [...prev.links, ...newLinks],
                };
            });

            // Center camera on clicked node
            if (graphRef.current) {
                // Need to cast node as any because 2d graph adds x,y
                const n = node as any;
                graphRef.current.centerAt(n.x, n.y, 1000);
                graphRef.current.zoom(2, 1000);
            }
        } catch (err) {
            console.error('Failed to load node neighborhood:', err);
        } finally {
            setFocusMode(prev => ({ ...prev, isLoading: false }));
        }
    }, [workspaceId, focusMode.focusedNodeId, onNodeClick, router]);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name || 'Unknown';
        const fontSize = 12 / globalScale;
        const nodeR = Math.sqrt(node.val || 1) * DEFAULT_GRAPH_CONFIG.nodeRelSize;
        const isFocused = focusMode.focusedNodeId === node.id;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
        ctx.fillStyle = NODE_COLORS[node.type as keyof typeof NODE_COLORS] || '#6B7280';
        ctx.fill();

        // Focus ring
        if (isFocused) {
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 3 / globalScale;
            ctx.stroke();
        }

        // Label
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#1F2937';
        ctx.fillText(label, node.x, node.y + nodeR + 2);
    }, [focusMode.focusedNodeId]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-600">
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            {(isLoading || focusMode.isLoading) && (
                <div className="absolute top-4 right-4 z-10 bg-white/80 px-3 py-1 rounded-full text-sm text-slate-600 shadow-sm">
                    Loading...
                </div>
            )}

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeId="id"
                nodeLabel="name"
                nodeCanvasObject={nodeCanvasObject}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    const nodeR = Math.sqrt(node.val || 1) * DEFAULT_GRAPH_CONFIG.nodeRelSize;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeR + 4, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                }}
                linkColor={() => '#CBD5E1'}
                linkWidth={DEFAULT_GRAPH_CONFIG.linkWidth}
                linkDirectionalParticles={DEFAULT_GRAPH_CONFIG.linkDirectionalParticles}
                linkDirectionalParticleWidth={2}
                onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
                onNodeHover={(node) => onNodeHover?.(node as GraphNode | null)}
                warmupTicks={DEFAULT_GRAPH_CONFIG.warmupTicks}
                cooldownTicks={DEFAULT_GRAPH_CONFIG.cooldownTicks}
                d3AlphaDecay={DEFAULT_GRAPH_CONFIG.d3AlphaDecay}
                d3VelocityDecay={DEFAULT_GRAPH_CONFIG.d3VelocityDecay}
                enableZoomInteraction={true}
                enablePanInteraction={true}
            />
        </div>
    );
}
