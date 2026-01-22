// ============================================
// USE LAYOUT WORKER HOOK
// ============================================

import { useEffect, useRef, useCallback, useState } from 'react';
import type {
  GraphNode,
  GraphLink,
  WorkerInputMessage,
  WorkerOutputMessage
} from '../workers/layout.types';

interface PositionMap {
  [nodeId: string]: { x: number; y: number; z: number };
}

interface UseLayoutWorkerReturn {
  positions: PositionMap;
  isReady: boolean;
  isRunning: boolean;
  alpha: number;
  initGraph: (nodes: GraphNode[], links: GraphLink[]) => void;
  pinNode: (nodeId: string, position: { x: number; y: number; z: number }) => void;
  reheat: () => void;
  terminate: () => void;
}

export function useLayoutWorker(): UseLayoutWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [positions, setPositions] = useState<PositionMap>({});
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [alpha, setAlpha] = useState(0);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/layout.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<WorkerOutputMessage | { type: 'READY' }>) => {
      const data = event.data;

      if (data.type === 'READY') {
        setIsReady(true);
        return;
      }

      const message = data as WorkerOutputMessage;

      switch (message.type) {
        case 'TICK':
        case 'END': {
          if (message.positions && message.nodeIds) {
            const newPositions: PositionMap = {};
            message.nodeIds.forEach((id, i) => {
              newPositions[id] = {
                x: message.positions![i * 3],
                y: message.positions![i * 3 + 1],
                z: message.positions![i * 3 + 2]
              };
            });
            setPositions(newPositions);
            setAlpha(message.alpha ?? 0);
            setIsRunning(message.type === 'TICK');
          }
          break;
        }

        case 'ERROR':
          console.error('[LayoutWorker Error]:', message.error);
          setIsRunning(false);
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('[LayoutWorker Fatal]:', error);
      setIsRunning(false);
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const postMessage = useCallback((message: WorkerInputMessage) => {
    if (workerRef.current && isReady) {
      workerRef.current.postMessage(message);
    }
  }, [isReady]);

  const initGraph = useCallback((nodes: GraphNode[], links: GraphLink[]) => {
    setIsRunning(true);
    postMessage({ type: 'INIT', nodes, links });
  }, [postMessage]);

  const pinNode = useCallback((nodeId: string, position: { x: number; y: number; z: number }) => {
    postMessage({ type: 'PIN_NODE', nodeId, position });
  }, [postMessage]);

  const reheat = useCallback(() => {
    setIsRunning(true);
    postMessage({ type: 'REHEAT' });
  }, [postMessage]);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    setIsReady(false);
    setIsRunning(false);
  }, []);

  return {
    positions,
    isReady,
    isRunning,
    alpha,
    initGraph,
    pinNode,
    reheat,
    terminate
  };
}