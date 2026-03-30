import { useEffect, useRef, useState, useCallback } from 'react';
import { McpWebSocketClient, type McpEventPreview } from '../adapters/zcorvus/McpWebSocketClient.js';
import { AgentStateMapper } from '../adapters/zcorvus/AgentStateMapper.js';
import { getZcorvusAgentRegistry, type AgentStateUpdate } from '../adapters/zcorvus/ZcorvusAgentRegistry.js';

export interface ZcorvusMcpIntegrationOptions {
  host?: string;
  port?: number;
  path?: string;
  autoConnect?: boolean;
  officeState?: { characters: Map<number, import('../office/types.js').Character>; seats: Map<string, import('../office/types.js').Seat> };
  onAgentRegistered?: () => void;
}

export interface UseZcorvusMcpReturn {
  isConnected: boolean;
  connectionState: string;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  getAgentState: (agentId: number) => AgentStateUpdate | undefined;
  getAllAgentIds: () => number[];
}

export function useZcorvusMcp(options: ZcorvusMcpIntegrationOptions = {}): UseZcorvusMcpReturn {
  const {
    host = '127.0.0.1',
    port = 4311,
    path = '/ws',
    autoConnect = true,
    officeState: providedOfficeState,
    onAgentRegistered,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('CLOSED');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<McpWebSocketClient | null>(null);
  const mapperRef = useRef<AgentStateMapper | null>(null);
  const registryRef = useRef<ReturnType<typeof getZcorvusAgentRegistry> | null>(null);
  const officeStateRef = useRef(providedOfficeState);

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

  const getAllAgentIds = useCallback(() => {
    return registryRef.current?.getAllAgentIds() || [];
  }, []);

  useEffect(() => {
    mapperRef.current = new AgentStateMapper();
    registryRef.current = getZcorvusAgentRegistry();
    
    if (providedOfficeState && !registryRef.current.initialized) {
      console.log('[ZcorvusMCP] Initializing registry immediately with officeState');
      officeStateRef.current = providedOfficeState;
      registryRef.current.initialize(providedOfficeState);
    }

    clientRef.current = new McpWebSocketClient({
      host,
      port,
      path,
      onConnect: () => {
        setIsConnected(true);
        setConnectionState('OPEN');
        setError(null);
        console.log('[ZcorvusMCP] WebSocket connected');
        
        if (!registryRef.current?.initialized && officeStateRef.current) {
          console.log('[ZcorvusMCP] Initializing registry with officeState');
          registryRef.current?.initialize(officeStateRef.current);
        }
      },
      onDisconnect: (err?: Error) => {
        setIsConnected(false);
        setConnectionState('CLOSED');
        if (err) {
          setError(err.message);
        }
      },
      onEventsUpdated: (event: McpEventPreview) => {
        if (!mapperRef.current || !registryRef.current) {
          console.log('[ZcorvusMCP] Mapper or registry not ready');
          return;
        }

        console.log('[ZcorvusMCP] Raw event:', event.type, 'agent:', event.agent, 'assignedTo:', event.assignedTo, 'taskId:', event.taskId, 'status:', event.status);

        const mapped = mapperRef.current.mapEvent({
          type: event.type,
          agent: event.agent,
          taskId: event.taskId,
          assignedTo: event.assignedTo,
          status: event.status,
          correlationId: event.correlationId,
          timestamp: event.timestamp,
        });

        const agentIdentifier = event.agent || event.assignedTo || 'unknown';

        if (mapped) {
          console.log('[ZcorvusMCP] Mapped:', mapped.eventType, '-> isActive:', mapped.isActive, 'state:', mapped.state, 'agent:', mapped.agentId);
          const prevCount = registryRef.current.getAgentCount();
          const agentId = registryRef.current.registerAgentFromMcpEvent(agentIdentifier);
          console.log('[ZcorvusMCP] Agent registered/updated:', agentId, 'name:', registryRef.current.getAgentName(agentId));
          
          if (registryRef.current.getAgentCount() > prevCount && onAgentRegistered) {
            onAgentRegistered();
          }

          console.log('[ZcorvusMCP] Updating state, isActive:', mapped.isActive);
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
        } else {
          console.log('[ZcorvusMCP] Event not mapped:', event.type, '-> Using agent field:', agentIdentifier);
          const prevCount = registryRef.current.getAgentCount();
          const agentId = registryRef.current.registerAgentFromMcpEvent(agentIdentifier);
          console.log('[ZcorvusMCP] Fallback registered agent:', agentId);
          if (registryRef.current.getAgentCount() > prevCount && onAgentRegistered) {
            onAgentRegistered();
          }
        }
      },
      onError: (err: Error) => {
        console.log('[ZcorvusMCP] WebSocket error:', err.message);
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
    getAllAgentIds,
  };
}

export function initializeZcorvusMcp(officeState: { characters: Map<number, unknown>; seats: Map<string, unknown> }): void {
  const registry = getZcorvusAgentRegistry();
  registry.initialize(officeState as { characters: Map<number, import('../office/types.js').Character>; seats: Map<string, import('../office/types.js').Seat> });
}