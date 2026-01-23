import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { useGraphStore } from '@/stores/graphStore';
import { useReasoningLogStore } from '@/stores/reasoningLogStore';
import { ReasoningLog } from '@/components/reasoning/ReasoningLog';

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  readyState = WebSocket.OPEN;

  constructor(url: string) {
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    // Echo back for testing
  }

  close() {
    this.onclose?.();
  }
}

(global as any).WebSocket = MockWebSocket;

describe('Phase 4: The Infinite Interface', () => {
  beforeEach(() => {
    useGraphStore.setState({
      graphData: { nodes: [], links: [] },
      selectedNodeId: null,
      currentZoom: 1,
      lodLevel: 'far'
    });

    useReasoningLogStore.setState({
      entries: [],
      currentPhase: 'idle',
      phaseHistory: [],
      cycleCount: 0,
      isAgentActive: false,
      averageCycleTime: 0,
      confidenceHistory: []
    });
  });

  describe('Graph Store', () => {
    it('should calculate LOD level based on zoom', () => {
      const { setZoom } = useGraphStore.getState();

      act(() => setZoom(400));
      expect(useGraphStore.getState().lodLevel).toBe('far');

      act(() => setZoom(200));
      expect(useGraphStore.getState().lodLevel).toBe('mid');

      act(() => setZoom(100));
      expect(useGraphStore.getState().lodLevel).toBe('close');
    });

    it('should add nodes to graph data', () => {
      const { addNode } = useGraphStore.getState();

      act(() => {
        addNode({
          id: 'test_node',
          name: 'Test Node',
          type: 'entity',
          centrality: 0.5
        });
      });

      expect(useGraphStore.getState().graphData.nodes).toHaveLength(1);
      expect(useGraphStore.getState().graphData.nodes[0].id).toBe('test_node');
    });
  });

  describe('Reasoning Log Store', () => {
    it('should track phase transitions correctly', () => {
      const { setCurrentPhase } = useReasoningLogStore.getState();

      act(() => setCurrentPhase('perceiving'));
      expect(useReasoningLogStore.getState().currentPhase).toBe('perceiving');
      expect(useReasoningLogStore.getState().cycleCount).toBe(1);

      act(() => setCurrentPhase('predicting'));
      expect(useReasoningLogStore.getState().cycleCount).toBe(1);

      act(() => setCurrentPhase('perceiving'));
      expect(useReasoningLogStore.getState().cycleCount).toBe(2);
    });

    it('should limit entries to MAX_ENTRIES', () => {
      const { addEntry } = useReasoningLogStore.getState();

      act(() => {
        for (let i = 0; i < 150; i++) {
          addEntry({
            id: `entry_${i}`,
            timestamp: Date.now(),
            phase: 'perceiving',
            description: `Entry ${i}`,
            affectedNodes: [],
            confidence: 0.8
          });
        }
      });

      expect(useReasoningLogStore.getState().entries).toHaveLength(100);
    });
  });

  describe('Reasoning Log UI', () => {
    it('should render and toggle correctly', () => {
      const onToggle = jest.fn();

      render(<ReasoningLog isOpen={true} onToggle={onToggle} />);

      expect(screen.getByText('Reasoning Log')).toBeInTheDocument();

      const toggleBtn = screen.getByRole('button', { name: /close reasoning log/i });
      fireEvent.click(toggleBtn);

      expect(onToggle).toHaveBeenCalled();
    });

    it('should display current phase correctly', () => {
      act(() => {
        useReasoningLogStore.getState().setCurrentPhase('predicting');
      });

      render(<ReasoningLog isOpen={true} onToggle={() => {}} />);

      expect(screen.getByText(/PREDICTING/i)).toBeInTheDocument();
    });
  });
});