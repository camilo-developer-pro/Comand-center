// ============================================
// LAYOUT WORKER TYPE DEFINITIONS
// ============================================

export interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  // Custom properties
  label?: string;
  type?: string;
  weight?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  strength?: number;
}

export interface WorkerInputMessage {
  type: 'INIT' | 'UPDATE_NODES' | 'PIN_NODE' | 'REHEAT';
  nodes?: GraphNode[];
  links?: GraphLink[];
  nodeId?: string;
  position?: { x: number; y: number; z: number };
}

export interface WorkerOutputMessage {
  type: 'TICK' | 'END' | 'ERROR';
  positions?: Float32Array; // [x0, y0, z0, x1, y1, z1, ...]
  nodeIds?: string[];       // Parallel array for ID mapping
  alpha?: number;
  error?: string;
}

export interface SimulationConfig {
  warmupTicks: number;
  cooldownTicks: number;
  alphaDecay: number;
  velocityDecay: number;
  chargeStrength: number;
  linkDistance: number;
  centerStrength: number;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  warmupTicks: 100,
  cooldownTicks: 0,
  alphaDecay: 0.0228,
  velocityDecay: 0.4,
  chargeStrength: -120,
  linkDistance: 50,
  centerStrength: 0.05
};