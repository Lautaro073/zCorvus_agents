"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { createQueryClient } from "@/lib/query/client";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
