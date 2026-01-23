'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useGraphWebSocket } from '@/hooks/useGraphWebSocket';
import { ReasoningLog } from '@/components/reasoning/ReasoningLog';
import { useGraphStore } from '@/stores/graphStore';

// Dynamic import for SSR safety
const GraphContainer = dynamic(
  () => import('@/components/graph/GraphContainer'),
  { ssr: false }
);

export default function CommandCenterPage() {
  const [isLogOpen, setIsLogOpen] = useState(true);
  const { send } = useGraphWebSocket();
  const { graphData, setGraphData } = useGraphStore();

  // Load initial test data if no WebSocket data
  useEffect(() => {
    if (graphData.nodes.length === 0) {
      loadTestData();
    }
  }, []);

  const loadTestData = async () => {
    // Generate test nodes
    const testNodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `node_${i}`,
      name: `Entity ${i}`,
      type: (['entity', 'process', 'agent', 'belief'] as const)[i % 4],
      centrality: Math.random(),
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500,
      z: (Math.random() - 0.5) * 500
    }));

    // Generate test links
    const testLinks = Array.from({ length: 2000 }, (_, i) => ({
      source: testNodes[Math.floor(Math.random() * testNodes.length)].id,
      target: testNodes[Math.floor(Math.random() * testNodes.length)].id,
      type: (['causal', 'temporal', 'semantic'] as const)[i % 3],
      weight: Math.random()
    }));

    setGraphData({ nodes: testNodes, links: testLinks });
  };

  const handleZoomChange = useCallback((zoom: number) => {
    console.log('Zoom level:', zoom);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    console.log('Node clicked:', node);
    send({ type: 'node_select', payload: { nodeId: node.id } });
  }, [send]);

  return (
    <main className="command-center">
      <div className="graph-area">
        <GraphContainer
          width={typeof window !== 'undefined' ? window.innerWidth - (isLogOpen ? 360 : 48) : 800}
          height={typeof window !== 'undefined' ? window.innerHeight : 600}
          onZoomChange={handleZoomChange}
          onNodeClick={handleNodeClick}
        />
      </div>

      <ReasoningLog
        isOpen={isLogOpen}
        onToggle={() => setIsLogOpen(!isLogOpen)}
      />

      <style jsx>{`
        .command-center {
          display: flex;
          height: 100vh;
          background: #0f172a;
          overflow: hidden;
        }

        .graph-area {
          flex: 1;
          position: relative;
        }
      `}</style>
    </main>
  );
}