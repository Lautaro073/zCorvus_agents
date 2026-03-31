import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMonitorStore } from '@/store/monitorStore';
import { wsClient } from '@/lib/wsClient';
import { QUERY_KEYS } from '@/lib/queryClient';
import { getMcpApiBase } from '@/lib/mcpEndpoints';
import type { McpEvent } from '@/types/mcp';

const API_BASE = getMcpApiBase();
const USE_LOCAL_FIXTURES = import.meta.env.VITE_E2E_USE_FIXTURES === 'true';

async function fetchEvents(): Promise<McpEvent[]> {
  const response = await fetch(`${API_BASE}/events`);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const payload = (await response.json()) as unknown;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'events' in payload &&
    Array.isArray((payload as { events?: unknown }).events)
  ) {
    return (payload as { events: McpEvent[] }).events;
  }

  throw new Error('Unexpected events payload shape');
}

export function useMcpEvents() {
  const queryClient = useQueryClient();
  const { setEvents, addEvent, setConnected } = useMonitorStore();

  const query = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: fetchEvents,
    enabled: !USE_LOCAL_FIXTURES,
    refetchInterval: USE_LOCAL_FIXTURES ? false : 10000,
  });

  const handleNewEvent = useCallback(
    (event: McpEvent) => {
      addEvent(event);
      queryClient.setQueryData<McpEvent[]>(QUERY_KEYS.events, (old) => {
        if (!old) return [event];
        const exists = old.some((e) => e.eventId === event.eventId);
        if (exists) return old;
        return [event, ...old].slice(0, 1000);
      });
    },
    [addEvent, queryClient]
  );

  const handleOpen = useCallback(() => {
    setConnected(true);
  }, [setConnected]);

  const handleClose = useCallback(() => {
    setConnected(false);
  }, [setConnected]);

  useEffect(() => {
    if (USE_LOCAL_FIXTURES) {
      return;
    }

    if (query.data) {
      setEvents(query.data);
    }
  }, [query.data, setEvents]);

  useEffect(() => {
    if (USE_LOCAL_FIXTURES) {
      setConnected(false);
      return;
    }

    wsClient.connect();

    const unsubMessage = wsClient.onMessage(handleNewEvent);
    const unsubOpen = wsClient.onOpen(handleOpen);
    const unsubClose = wsClient.onClose(handleClose);

    return () => {
      unsubMessage();
      unsubOpen();
      unsubClose();
      wsClient.disconnect();
    };
  }, [handleNewEvent, handleOpen, handleClose, setConnected]);

  return {
    events: USE_LOCAL_FIXTURES ? [] : query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isConnected: wsClient.isConnected,
    refetch: query.refetch,
  };
}
