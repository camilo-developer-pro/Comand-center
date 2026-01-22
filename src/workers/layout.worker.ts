// @ts-nocheck
// ============================================
// LAYOUT WEB WORKER - D3-FORCE SIMULATION
// ============================================

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum
} from 'd3-force-3d';

import type {
  GraphNode,
  GraphLink,
  WorkerInputMessage,
  WorkerOutputMessage,
  SimulationConfig
} from './layout.types';

let simulation: Simulation<GraphNode, GraphLink> | null = null;
let nodeMap: Map<string, GraphNode> = new Map();
let nodeIds: string[] = [];

const config: SimulationConfig = {
  warmupTicks: 100,
  cooldownTicks: 0,
  alphaDecay: 0.0228,
  velocityDecay: 0.4,
  chargeStrength: -120,
  linkDistance: 50,
  centerStrength: 0.05
};

function createPositionBuffer(): Float32Array {
  const buffer = new Float32Array(nodeIds.length * 3);
  nodeIds.forEach((id, i) => {
    const node = nodeMap.get(id);
    if (node) {
      buffer[i * 3] = node.x ?? 0;
      buffer[i * 3 + 1] = node.y ?? 0;
      buffer[i * 3 + 2] = node.z ?? 0;
    }
  });
  return buffer;
}

function sendPositions(type: 'TICK' | 'END', alpha?: number): void {
  const positions = createPositionBuffer();
  const message: WorkerOutputMessage = {
    type,
    positions,
    nodeIds: [...nodeIds],
    alpha
  };

  // Transfer the buffer for zero-copy performance
  (self as any).postMessage(message, [positions.buffer]);
}

function initSimulation(nodes: GraphNode[], links: GraphLink[]): void {
  // Clear previous state
  if (simulation) {
    simulation.stop();
  }
  
  nodeMap.clear();
  nodeIds = [];
  
  // Build node map
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node });
    nodeIds.push(node.id);
  });
  
  const nodeArray = Array.from(nodeMap.values());
  
  // Resolve link references
  const resolvedLinks = links.map(link => ({
    source: nodeMap.get(link.source as string)!,
    target: nodeMap.get(link.target as string)!,
    strength: link.strength
  })).filter(l => l.source && l.target);
  
  // Create simulation
  simulation = forceSimulation<GraphNode, any>(nodeArray, 3)
    .alphaDecay(config.alphaDecay)
    .velocityDecay(config.velocityDecay)
    .force('link', forceLink<GraphNode, any>(resolvedLinks)
      .id((d: GraphNode) => d.id)
      .distance(config.linkDistance)
      .strength((link: any) => link.strength ?? 1)
    )
    .force('charge', forceManyBody<GraphNode>()
      .strength(config.chargeStrength)
    )
    .force('center', forceCenter<GraphNode>(0, 0, 0)
      .strength(config.centerStrength)
    )
    .force('collide', forceCollide<GraphNode>(8))
    .on('tick', () => {
      sendPositions('TICK', simulation?.alpha());
    })
    .on('end', () => {
      sendPositions('END', 0);
    });
  
  // Warmup ticks (run synchronously, no rendering)
  simulation.stop();
  for (let i = 0; i < config.warmupTicks; i++) {
    simulation.tick();
  }
  
  // Send initial positions after warmup
  sendPositions('TICK', simulation.alpha());
  
  // Continue simulation
  if (config.cooldownTicks === 0) {
    // Run until natural stop
    simulation.restart();
  }
}

function pinNode(nodeId: string, position: { x: number; y: number; z: number }): void {
  const node = nodeMap.get(nodeId);
  if (node) {
    node.fx = position.x;
    node.fy = position.y;
    node.fz = position.z;
    simulation?.alpha(0.3).restart();
  }
}

function reheat(): void {
  simulation?.alpha(1).restart();
}

// Message handler
self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const { type, nodes, links, nodeId, position } = event.data;
  
  try {
    switch (type) {
      case 'INIT':
        if (nodes && links) {
          initSimulation(nodes, links);
        }
        break;
      
      case 'UPDATE_NODES':
        if (nodes && links) {
          initSimulation(nodes, links);
        }
        break;
      
      case 'PIN_NODE':
        if (nodeId && position) {
          pinNode(nodeId, position);
        }
        break;
      
      case 'REHEAT':
        reheat();
        break;
    }
  } catch (error) {
    const errorMessage: WorkerOutputMessage = {
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown worker error'
    };
    self.postMessage(errorMessage);
  }
};

// Signal worker is ready
self.postMessage({ type: 'READY' });