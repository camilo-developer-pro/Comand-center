import { Object3D } from 'three';

export interface GraphNode {
  id: string;
  name: string;
  type: 'entity' | 'process' | 'agent' | 'belief';
  centrality: number; // 0-1 normalized PageRank
  x?: number;
  y?: number;
  z?: number;
  __threeObj?: Object3D;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'causal' | 'temporal' | 'semantic';
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type ReasoningPhase = 
  | 'idle'
  | 'perceiving'
  | 'predicting'
  | 'acting'
  | 'updating_beliefs';

export interface ReasoningLogEntry {
  id: string;
  timestamp: number;
  phase: ReasoningPhase;
  description: string;
  affectedNodes: string[];
  confidence: number;
}