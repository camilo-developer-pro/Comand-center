import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { GraphWebSocketService, getGraphWebSocket } from '@/services/graphWebSocket';

const WS_URL = process.env.NEXT_PUBLIC_GRAPH_WS_URL || 'ws://localhost:8080/graph';

export const useGraphWebSocket = () => {
  const wsRef = useRef<GraphWebSocketService | null>(null);
  const { setGraphData, addNode, updateNodePosition } = useGraphStore();

  const connect = useCallback(() => {
    wsRef.current = getGraphWebSocket(WS_URL);

    wsRef.current.connect({
      onNodeUpdate: (node) => {
        if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
          updateNodePosition(node.id, node.x, node.y, node.z);
        }
      },
      onNodeAdd: (node) => {
        addNode(node);
      },
      onBulkSync: (data) => {
        setGraphData(data);
      },
      onConnectionChange: (connected) => {
        console.log('WebSocket connected:', connected);
      }
    });
  }, [setGraphData, addNode, updateNodePosition]);

  useEffect(() => {
    connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [connect]);

  return {
    send: (data: { type: string; payload: any }) => wsRef.current?.send(data)
  };
};