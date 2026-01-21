import type { GraphNode, GraphLink, GraphData, EntityType, RelationType, GraphNeighborhoodResponse } from '@/types/helpers';

// Re-export for module use
export type { GraphNode, GraphLink, GraphData, EntityType, RelationType, GraphNeighborhoodResponse };

// Component-specific types
export interface NeuralGraphProps {
    workspaceId: string;
    initialNodeId?: string;
    onNodeClick?: (node: GraphNode) => void;
    onNodeHover?: (node: GraphNode | null) => void;
    maxInitialNodes?: number;
}

export interface FocusModeState {
    focusedNodeId: string | null;
    depth: number;
    isLoading: boolean;
}

// Force graph configuration
export interface ForceGraphConfig {
    nodeRelSize: number;
    linkWidth: number;
    linkDirectionalParticles: number;
    warmupTicks: number;
    cooldownTicks: number;
    d3AlphaDecay: number;
    d3VelocityDecay: number;
}

export const DEFAULT_GRAPH_CONFIG: ForceGraphConfig = {
    nodeRelSize: 6,
    linkWidth: 1,
    linkDirectionalParticles: 2,
    warmupTicks: 100,
    cooldownTicks: 50,
    d3AlphaDecay: 0.02,
    d3VelocityDecay: 0.3,
};

// Node color mapping
export const NODE_COLORS: Record<EntityType, string> = {
    document: '#3B82F6', // blue-500
    lead: '#EF4444',     // red-500
    user: '#10B981',     // emerald-500
    task: '#F59E0B',     // amber-500
    item: '#8B5CF6',     // violet-500
};
