import { useEffect, useRef, useState, useCallback } from 'react';
import { McpWebSocketClient, type McpEventPreview } from '../adapters/zcorvus/McpWebSocketClient.js';
import { AgentStateMapper } from '../adapters/zcorvus/AgentStateMapper.js';
import { getZcorvusAgentRegistry, type AgentStateUpdate } from '../adapters/zcorvus/ZcorvusAgentRegistry.js';

export interface ZcorvusMcpIntegrationOptions {
  host?: string;
  port?: number;
  path?: string;
  autoConnect?: boolean;
}

export interface UseZcorvusMcpReturn {
  isConnected: boolean;
  connectionState: string;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  getAgentState: (agentId: number) => AgentStateUpdate | undefined;
}

export function useZcorvusMcp(options: ZcorvusMcpIntegrationOptions = {}): UseZcorvusMcpReturn {
  const {
    host = '127.0.0.1',
    port = 4311,
    path = '/ws',
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('CLOSED');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<McpWebSocketClient | null>(null);
  const mapperRef = useRef<AgentStateMapper | null>(null);
  const registryRef = useRef<ReturnType<typeof getZcorvusAgentRegistry> | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  const getAgentState = useCallback((agentId: number) => {
    return registryRef.current?.getAgentState(agentId);
  }, []);

  useEffect(() => {
    mapperRef.current = new AgentStateMapper();
    registryRef.current = getZcorvusAgentRegistry();

    clientRef.current = new McpWebSocketClient({
      host,
      port,
      path,
      onConnect: () => {
        setIsConnected(true);
        setConnectionState('OPEN');
        setError(null);
      },
      onDisconnect: (err?: Error) => {
        setIsConnected(false);
        setConnectionState('CLOSED');
        if (err) {
          setError(err.message);
        }
      },
      onEventsUpdated: (event: McpEventPreview) => {
        if (!mapperRef.current || !registryRef.current) return;

        const mapped = mapperRef.current.mapEvent({
          type: event.type,
          agent: event.agent,
          taskId: event.taskId,
          assignedTo: event.assignedTo,
          status: event.status,
          correlationId: event.correlationId,
          timestamp: event.timestamp,
        });

        if (mapped) {
          const agentId = registryRef.current.registerAgentFromMcpEvent(mapped.agentId);

          registryRef.current.updateAgentState({
            agentId,
            state: mapped.state,
            tool: mapped.tool,
            bubbleType: mapped.bubbleType,
            alertType: mapped.alertType,
            isActive: mapped.isActive,
            message: mapped.message,
            taskId: mapped.taskId,
            correlationId: mapped.correlationId,
          });
        }
      },
      onError: (err: Error) => {
        setError(err.message);
      },
    });

    if (autoConnect) {
      clientRef.current.connect();
    }

    return () => {
      clientRef.current?.disconnect();
    };
  }, [host, port, path, autoConnect]);

  return {
    isConnected,
    connectionState,
    error,
    connect,
    disconnect,
    getAgentState,
  };
}

export function initializeZcorvusMcp(officeState: { characters: Map<number, unknown>; seats: Map<string, unknown> }): void {
  const registry = getZcorvusAgentRegistry();
  registry.initialize(officeState as { characters: Map<number, import('../office/types.js').Character>; seats: Map<string, import('../office/types.js').Seat> });
}