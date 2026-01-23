import { GraphNode, GraphLink, ReasoningLogEntry } from '@/types/graph.types';

type MessageType =
  | 'node_update'
  | 'link_update'
  | 'node_add'
  | 'node_remove'
  | 'reasoning_phase'
  | 'bulk_sync'
  | 'request_sync';

interface WSMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
}

interface GraphWSCallbacks {
  onNodeUpdate?: (node: Partial<GraphNode> & { id: string }) => void;
  onLinkUpdate?: (link: GraphLink) => void;
  onNodeAdd?: (node: GraphNode) => void;
  onNodeRemove?: (nodeId: string) => void;
  onReasoningPhase?: (entry: ReasoningLogEntry) => void;
  onBulkSync?: (data: { nodes: GraphNode[]; links: GraphLink[] }) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class GraphWebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: GraphWSCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: WSMessage[] = [];
  private isProcessing = false;

  constructor(private url: string) {}

  connect(callbacks: GraphWSCallbacks): void {
    this.callbacks = callbacks;
    this.initializeConnection();
  }

  private initializeConnection(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[GraphWS] Connected');
        this.reconnectAttempts = 0;
        this.callbacks.onConnectionChange?.(true);

        // Request initial sync
        this.send({ type: 'request_sync', payload: {} });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.queueMessage(message);
        } catch (e) {
          console.error('[GraphWS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[GraphWS] Disconnected');
        this.callbacks.onConnectionChange?.(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[GraphWS] Error:', error);
      };
    } catch (error) {
      console.error('[GraphWS] Connection failed:', error);
      this.attemptReconnect();
    }
  }

  private queueMessage(message: WSMessage): void {
    this.messageQueue.push(message);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.messageQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    // Process in batches for performance
    const batchSize = 10;
    const batch = this.messageQueue.splice(0, batchSize);

    batch.forEach(message => this.handleMessage(message));

    // Continue processing on next frame
    requestAnimationFrame(() => this.processQueue());
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'node_update':
        this.callbacks.onNodeUpdate?.(message.payload);
        break;
      case 'link_update':
        this.callbacks.onLinkUpdate?.(message.payload);
        break;
      case 'node_add':
        this.callbacks.onNodeAdd?.(message.payload);
        break;
      case 'node_remove':
        this.callbacks.onNodeRemove?.(message.payload.id);
        break;
      case 'reasoning_phase':
        this.callbacks.onReasoningPhase?.(message.payload);
        break;
      case 'bulk_sync':
        this.callbacks.onBulkSync?.(message.payload);
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[GraphWS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[GraphWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => this.initializeConnection(), delay);
  }

  send(data: { type: string; payload: any }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

// Singleton instance
let wsInstance: GraphWebSocketService | null = null;

export const getGraphWebSocket = (url?: string): GraphWebSocketService => {
  if (!wsInstance && url) {
    wsInstance = new GraphWebSocketService(url);
  }
  return wsInstance!;
};