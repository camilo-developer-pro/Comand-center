'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { GraphData, GraphNode, GraphLink } from '@/types/graph.types';
import { useGraphStore } from '@/stores/graphStore';
import { InstancedNodeRenderer } from './InstancedNodeRenderer';
import { LabelSpriteManager } from './LabelSpriteManager';

// Dynamic import to avoid SSR issues with Three.js
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => <div className="graph-loading">Initializing WebGL...</div>
});

interface GraphContainerProps {
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onZoomChange?: (zoom: number) => void;
}

export const GraphContainer: React.FC<GraphContainerProps> = ({
  width = 800,
  height = 600,
  onNodeClick,
  onZoomChange
}) => {
  const graphRef = useRef<any>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const { graphData, setSelectedNode } = useGraphStore();

  // Expose scene for external manipulation
  const getScene = useCallback(() => {
    return graphRef.current?.scene();
  }, []);

  const getCamera = useCallback(() => {
    return graphRef.current?.camera();
  }, []);

  // Zoom change handler with debounce
  const handleEngineStop = useCallback(() => {
    const camera = getCamera();
    if (camera) {
      const zoom = camera.position.length();
      setCurrentZoom(zoom);
      onZoomChange?.(zoom);
    }
  }, [getCamera, onZoomChange]);

  // Node click handler
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);

    // Animate camera to node
    if (graphRef.current && node.x !== undefined) {
      graphRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z! + 100 },
        { x: node.x, y: node.y, z: node.z },
        1000
      );
    }
  }, [setSelectedNode, onNodeClick]);

  // Custom node rendering (placeholder - will be replaced by InstancedMesh)
  const nodeThreeObject = useCallback((node: GraphNode) => {
    // This will be overridden in Prompt 3
    return undefined;
  }, []);

  // InstancedMesh integration
  const instancedRenderer = useRef<InstancedNodeRenderer | null>(null);
  const labelManager = useRef<LabelSpriteManager | null>(null);
  const animationFrameId = useRef<number>(0);

  // Initialize InstancedMesh after graph mounts
  useEffect(() => {
    const initializeRenderers = () => {
      const scene = getScene();
      const camera = getCamera();
      if (!scene || !camera || graphData.nodes.length === 0) return;

      if (!instancedRenderer.current) {
        instancedRenderer.current = new InstancedNodeRenderer(100000);
      }

      instancedRenderer.current.initialize(scene, graphData.nodes);

      // Initialize Labels
      if (!labelManager.current) {
        labelManager.current = new LabelSpriteManager();
      }
      labelManager.current.initialize(scene, graphData.nodes);

      // Hide default node objects
      scene.traverse((obj: THREE.Object3D) => {
        if (obj.userData.isGraphNode) {
          obj.visible = false;
        }
      });
    };

    // Wait for graph to initialize
    const timeoutId = setTimeout(initializeRenderers, 500);

    return () => {
      clearTimeout(timeoutId);
      instancedRenderer.current?.dispose();
      labelManager.current?.dispose();
    };
  }, [graphData.nodes, getScene, getCamera]);

  // Animation loop for shader uniforms
  useEffect(() => {
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const camera = getCamera();

      if (camera) {
        const distance = camera.position.length();

        if (instancedRenderer.current) {
          instancedRenderer.current.updateUniforms(distance, elapsed);
        }

        if (labelManager.current) {
          labelManager.current.updateLOD(camera.position, distance);
        }
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [getCamera]);

  return (
    <div className="graph-container" style={{ width, height }}>
      <ForceGraph3D
        ref={graphRef}
        width={width}
        height={height}
        graphData={graphData}
        nodeId="id"
        nodeLabel="name"
        nodeVal={(node: any) => node.centrality * 10 + 1}
        nodeColor={(node: any) => {
          const colors: Record<string, string> = {
            entity: '#4f46e5',
            process: '#10b981',
            agent: '#f59e0b',
            belief: '#ec4899'
          };
          return colors[node.type] || '#6b7280';
        }}
        linkWidth={(link: any) => link.weight * 2}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        onNodeClick={handleNodeClick as any}
        onEngineStop={handleEngineStop}
        enableNodeDrag={true}
        enableNavigationControls={true}
        backgroundColor="#0f172a"
      />
    </div>
  );
};

export default GraphContainer;