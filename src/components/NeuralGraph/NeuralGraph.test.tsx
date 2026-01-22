// ============================================
// NEURAL GRAPH INTEGRATION TESTS
// ============================================

import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NeuralGraph } from './NeuralGraph';
import type { GraphNode, GraphLink } from '../../workers/layout.types';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage: any;
  terminate = vi.fn();

  constructor() {
    // Simulate READY message after construction
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { type: 'READY' }
        } as MessageEvent);
      }
    }, 0);
  }
}

// Spy on postMessage
MockWorker.prototype.postMessage = vi.fn(function(this: MockWorker, message: any) {
  // Simulate worker response
  setTimeout(() => {
    if (message.type === 'INIT' && this.onmessage) {
      const mockPositions = new Float32Array(message.nodes.length * 3);
      message.nodes.forEach((_: any, i: number) => {
        mockPositions[i * 3] = Math.random() * 100;
        mockPositions[i * 3 + 1] = Math.random() * 100;
        mockPositions[i * 3 + 2] = 0;
      });
      this.onmessage({
        data: {
          type: 'TICK',
          positions: mockPositions,
          nodeIds: message.nodes.map((n: GraphNode) => n.id),
          alpha: 0.5
        }
      } as MessageEvent);
    }
  }, 10);
});

vi.stubGlobal('Worker', MockWorker);

describe('NeuralGraph', () => {
  const mockNodes: GraphNode[] = [
    { id: 'node-1', label: 'Node 1', type: 'primary' },
    { id: 'node-2', label: 'Node 2', type: 'secondary' },
    { id: 'node-3', label: 'Node 3', type: 'default' }
  ];

  const mockLinks: GraphLink[] = [
    { source: 'node-1', target: 'node-2' },
    { source: 'node-2', target: 'node-3' }
  ];

  it('renders without crashing', () => {
    render(<NeuralGraph nodes={mockNodes} links={mockLinks} />);
    expect(document.querySelector('.neural-graph-container')).toBeInTheDocument();
  });

  it('initializes worker with graph data', async () => {
    render(<NeuralGraph nodes={mockNodes} links={mockLinks} />);
    
    await waitFor(() => {
      const worker = MockWorker.prototype;
      expect(worker.postMessage).toHaveBeenCalled();
    });
  });

  it('shows loading status during calculation', async () => {
    render(<NeuralGraph nodes={mockNodes} links={mockLinks} />);
    
    await waitFor(() => {
      const status = document.querySelector('.neural-graph-status');
      expect(status).toBeInTheDocument();
    });
  });
});

// ============================================
// PERFORMANCE BENCHMARK (Manual Run)
// ============================================

export async function runPerformanceBenchmark(): Promise<void> {
  const LARGE_NODE_COUNT = 5000;
  const LINK_DENSITY = 3; // links per node

  console.log(`[Benchmark] Generating ${LARGE_NODE_COUNT} nodes...`);
  
  const largeNodes: GraphNode[] = Array.from({ length: LARGE_NODE_COUNT }, (_, i) => ({
    id: `node-${i}`,
    label: `N${i}`,
    type: ['primary', 'secondary', 'default'][i % 3]
  }));

  const largeLinks: GraphLink[] = [];
  for (let i = 0; i < LARGE_NODE_COUNT; i++) {
    for (let j = 0; j < LINK_DENSITY; j++) {
      const target = Math.floor(Math.random() * LARGE_NODE_COUNT);
      if (target !== i) {
        largeLinks.push({ source: `node-${i}`, target: `node-${target}` });
      }
    }
  }

  console.log(`[Benchmark] Generated ${largeLinks.length} links`);
  console.log('[Benchmark] Expected: 60fps with WebGL, <100ms warmup');
  
  // This would be rendered in a test environment
  // Actual FPS measurement requires browser DevTools
}