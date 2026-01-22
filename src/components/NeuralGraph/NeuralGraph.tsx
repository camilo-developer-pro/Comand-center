// ============================================
// NEURAL GRAPH - WEBGL OPTIMIZED COMPONENT
// ============================================

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import './NeuralGraph.css';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { useLayoutWorker } from '../../hooks/useLayoutWorker';
import type { GraphNode, GraphLink } from '../../workers/layout.types';

// ============================================
// TYPES
// ============================================

interface NeuralGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  className?: string;
}

interface ExtendedNodeObject extends NodeObject {
  id: string;
  label?: string;
  type?: string;
  weight?: number;
  __threeObj?: any;
}

// ============================================
// CONSTANTS
// ============================================

const LOD_THRESHOLD = 1.5;
const NODE_BASE_SIZE = 6;
const NODE_LABEL_FONT = '4px Inter, system-ui, sans-serif';
const NODE_COLORS: Record<string, string> = {
  default: '#6366f1',
  primary: '#8b5cf6',
  secondary: '#ec4899',
  accent: '#14b8a6',
  warning: '#f59e0b',
  error: '#ef4444'
};

// ============================================
// LOD RENDERING FUNCTIONS
// ============================================

function drawNodeLowDetail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number
): void {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawNodeHighDetail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number,
  label: string
): void {
  // Draw node circle with glow
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  
  // Gradient fill
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, adjustColorBrightness(color, -30));
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Border
  ctx.strokeStyle = adjustColorBrightness(color, 40);
  ctx.lineWidth = 0.5;
  ctx.stroke();
  
  // Label
  if (label) {
    ctx.font = NODE_LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(label, x, y + size + 2);
  }
}

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const NeuralGraph: React.FC<NeuralGraphProps> = ({
  nodes,
  links,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover,
  className = ''
}) => {
  const graphRef = useRef<any>(null);
  const {
    positions,
    isReady,
    isRunning,
    initGraph,
    pinNode
  } = useLayoutWorker();

  // Merge worker positions with node data
  const graphData = useMemo(() => {
    const mergedNodes: ExtendedNodeObject[] = nodes.map(node => {
      const pos = positions[node.id];
      const merged = {
        ...node,
        ...(pos ? pos : {})
      };
      return {
        ...merged,
        fx: merged.fx === null ? undefined : merged.fx,
        fy: merged.fy === null ? undefined : merged.fy,
        fz: merged.fz === null ? undefined : merged.fz
      } as ExtendedNodeObject;
    });

    return {
      nodes: mergedNodes,
      links: links.map(link => ({
        source: link.source,
        target: link.target
      }))
    };
  }, [nodes, links, positions]);

  // Initialize worker simulation
  useEffect(() => {
    if (isReady && nodes.length > 0) {
      initGraph(nodes, links);
    }
  }, [isReady, nodes, links, initGraph]);

  // Node canvas renderer with LOD
  const nodeCanvasObject = useCallback((
    node: ExtendedNodeObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const color = NODE_COLORS[node.type ?? 'default'] ?? NODE_COLORS.default;
    const size = NODE_BASE_SIZE * (node.weight ?? 1);

    // LOD: Low detail when zoomed out
    if (globalScale < LOD_THRESHOLD) {
      drawNodeLowDetail(ctx, x, y, color, size * 0.7);
    } else {
      drawNodeHighDetail(ctx, x, y, color, size, node.label ?? node.id);
    }
  }, []);

  // Link canvas renderer
  const linkCanvasObject = useCallback((
    link: LinkObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const source = link.source as ExtendedNodeObject;
    const target = link.target as ExtendedNodeObject;
    
    if (!source?.x || !target?.x) return;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y ?? 0);
    ctx.lineTo(target.x, target.y ?? 0);
    
    // Thinner lines when zoomed out
    ctx.strokeStyle = globalScale < LOD_THRESHOLD 
      ? 'rgba(148, 163, 184, 0.2)'
      : 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = globalScale < LOD_THRESHOLD ? 0.3 : 0.8;
    ctx.stroke();
  }, []);

  // Event handlers
  const handleNodeClick = useCallback((node: ExtendedNodeObject) => {
    onNodeClick?.(node as GraphNode);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: ExtendedNodeObject | null) => {
    onNodeHover?.(node as GraphNode | null);
  }, [onNodeHover]);

  const handleNodeDragEnd = useCallback((node: ExtendedNodeObject) => {
    if (node.x !== undefined && node.y !== undefined) {
      pinNode(node.id, {
        x: node.x,
        y: node.y,
        z: node.z ?? 0
      });
    }
  }, [pinNode]);

  return (
    <div className={`neural-graph-container ${className}`}>
      <ForceGraph2D
        ref={graphRef}
        width={width}
        height={height}
        graphData={graphData}
        // Performance optimizations
        warmupTicks={100}
        cooldownTicks={0}
        cooldownTime={0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        // Rendering
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        // Interaction
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onNodeDragEnd={handleNodeDragEnd}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        // Visual
        backgroundColor="transparent"
        // Disable internal engine (we use worker)
        enablePointerInteraction={true}
      />
      {isRunning && (
        <div className="neural-graph-status">
          Calculating layout...
        </div>
      )}
    </div>
  );
};

export default NeuralGraph;