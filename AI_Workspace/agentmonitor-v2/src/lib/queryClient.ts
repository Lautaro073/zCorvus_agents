import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const QUERY_KEYS = {
  events: ['events'] as const,
  event: (taskId: string) => ['event', taskId] as const,
  agents: ['agents'] as const,
  metrics: ['metrics'] as const,
};
