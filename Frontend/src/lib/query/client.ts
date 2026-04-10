import { QueryClient } from "@tanstack/react-query";
import { isBackendApiError } from "@/lib/api/backend";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isBackendApiError(error) && error.status === 401) {
            return false;
          }

          return failureCount < 2;
        },
      },
    },
  });
}
