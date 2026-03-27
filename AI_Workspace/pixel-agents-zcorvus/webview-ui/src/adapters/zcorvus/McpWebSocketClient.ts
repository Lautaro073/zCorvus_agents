export interface MCPEvent {
  eventId: string;
  timestamp: string;
  agent: string;
  type: string;
  taskId?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  correlationId?: string;
  parentTaskId?: string;
  payloadVersion: string;
  payload: Record<string, unknown>;
}

export interface McpEventPreview {
  eventId: string;
  timestamp: string;
  agent: string;
  type: string;
  taskId?: string;
  assignedTo?: string;
  status?: string;
  correlationId?: string;
}

export interface McpConnectedMessage {
  type: 'connected';
  generatedAt: string;
  latestEvent: McpEventPreview | null;
}

export interface McpEventsUpdatedMessage {
  type: 'events_updated';
  reason: string;
  latestEvent: McpEventPreview;
  generatedAt: string;
}

export type McpSocketMessage = McpConnectedMessage | McpEventsUpdatedMessage;

export interface McpWebSocketClientOptions {
  host?: string;
  port?: number;
  path?: string;
  onConnect?: () => void;
  onDisconnect?: (error?: Error) => void;
  onEventsUpdated?: (event: McpEventPreview, reason: string) => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectMultiplier?: number;
}

export class McpWebSocketClient {
  private ws: WebSocket | null = null;
  private host: string;
  private port: number;
  private path: string;
  private onConnect?: () => void;
  private onDisconnect?: (error?: Error) => void;
  private onEventsUpdated?: (event: McpEventPreview, reason: string) => void;
  private onError?: (error: Error) => void;
  private maxReconnectAttempts: number;
  private initialReconnectDelay: number;
  private maxReconnectDelay: number;
  private reconnectMultiplier: number;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  private shouldAttemptConnection = false;

  constructor(options: McpWebSocketClientOptions = {}) {
    this.host = options.host ?? '127.0.0.1';
    this.port = options.port ?? 4311;
    this.path = options.path ?? '/ws';
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
    this.onEventsUpdated = options.onEventsUpdated;
    this.onError = options.onError;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.initialReconnectDelay = options.initialReconnectDelay ?? 1000;
    this.maxReconnectDelay = options.maxReconnectDelay ?? 30000;
    this.reconnectMultiplier = options.reconnectMultiplier ?? 2;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.shouldAttemptConnection = true;
    this.doConnect();
  }

  private doConnect(): void {
    if (!this.shouldAttemptConnection) {
      return;
    }

    const url = `ws://${this.host}:${this.port}${this.path}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.onConnect?.();
  }

  private handleClose(_event: CloseEvent): void {
    if (this.isIntentionallyClosed) {
      this.onDisconnect?.();
      return;
    }

    const error = _event.wasClean
      ? undefined
      : new Error(`Connection closed unexpectedly (code: ${_event.code})`);

    this.onDisconnect?.(error);
    this.scheduleReconnect();
  }

  private handleError(): void {
    const error = new Error('WebSocket error');
    this.onError?.(error);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as McpSocketMessage;

      switch (data.type) {
        case 'connected':
          if (data.latestEvent) {
            this.onEventsUpdated?.(data.latestEvent, 'initial_connection');
          }
          break;

        case 'events_updated':
          if (data.latestEvent) {
            this.onEventsUpdated?.(data.latestEvent, data.reason);
          }
          break;
      }
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error('Failed to parse message'));
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldAttemptConnection || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(this.reconnectMultiplier, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  disconnect(): void {
    this.shouldAttemptConnection = false;
    this.isIntentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.onDisconnect?.();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'CLOSED';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}

export function parseMcpEvent(preview: McpEventPreview): MCPEvent {
  return {
    eventId: preview.eventId,
    timestamp: preview.timestamp,
    agent: preview.agent,
    type: preview.type,
    taskId: preview.taskId,
    assignedTo: preview.assignedTo,
    status: preview.status,
    correlationId: preview.correlationId,
    payloadVersion: '1.0',
    payload: {},
  };
}

export function getStatusColor(status?: string): string {
  switch (status) {
    case 'completed':
      return '#22c55e';
    case 'failed':
      return '#ef4444';
    case 'blocked':
      return '#f59e0b';
    case 'in_progress':
      return '#3b82f6';
    case 'accepted':
      return '#8b5cf6';
    case 'assigned':
      return '#6b7280';
    case 'cancelled':
      return '#9ca3af';
    default:
      return '#6b7280';
  }
}

export function getEventTypeIcon(type: string): string {
  switch (type) {
    case 'TASK_ASSIGNED':
      return '📋';
    case 'TASK_ACCEPTED':
      return '✅';
    case 'TASK_IN_PROGRESS':
      return '🔄';
    case 'TASK_COMPLETED':
      return '🎉';
    case 'TASK_BLOCKED':
      return '🚫';
    case 'TASK_FAILED':
      return '❌';
    case 'TASK_CANCELLED':
      return '⛔';
    case 'TEST_PASSED':
      return '✅';
    case 'TEST_FAILED':
      return '❎';
    case 'INCIDENT_OPENED':
      return '🚨';
    case 'INCIDENT_RESOLVED':
      return '🔧';
    default:
      return '📌';
  }
}