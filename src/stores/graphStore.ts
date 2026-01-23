import { create } from 'zustand';
import { GraphData, GraphNode, GraphLink } from '@/types/graph.types';

interface GraphState {
  graphData: GraphData;
  selectedNodeId: string | null;
  currentZoom: number;
  lodLevel: 'far' | 'mid' | 'close';

  // Actions
  setGraphData: (data: GraphData) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setZoom: (zoom: number) => void;
  addNode: (node: GraphNode) => void;
  updateNodePosition: (nodeId: string, x: number, y: number, z: number) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: { nodes: [], links: [] },
  selectedNodeId: null,
  currentZoom: 1,
  lodLevel: 'far',

  setGraphData: (data) => set({ graphData: data }),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setZoom: (zoom) => {
    let lodLevel: 'far' | 'mid' | 'close';
    if (zoom > 300) lodLevel = 'far';
    else if (zoom > 150) lodLevel = 'mid';
    else lodLevel = 'close';

    set({ currentZoom: zoom, lodLevel });
  },

  addNode: (node) => set((state) => ({
    graphData: {
      ...state.graphData,
      nodes: [...state.graphData.nodes, node]
    }
  })),

  updateNodePosition: (nodeId, x, y, z) => set((state) => ({
    graphData: {
      ...state.graphData,
      nodes: state.graphData.nodes.map(n =>
        n.id === nodeId ? { ...n, x, y, z } : n
      )
    }
  }))
}));