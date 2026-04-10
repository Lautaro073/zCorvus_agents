"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BackendApiError,
  type GetAdminMetricsParams,
  type AdminMetricsResult,
  getAdminMetrics,
  isBackendApiError,
} from "@/lib/api/backend";
import { useRouter } from "@/i18n/navigation";

const ADMIN_METRICS_QUERY_BASE_KEY = "admin-metrics";

interface UseAdminMetricsOptions {
  enabled?: boolean;
}

function buildMetricsQueryKeyParams(params: GetAdminMetricsParams = {}) {
  return {
    granularity: params.granularity ?? "day",
    from: params.from ?? "",
    to: params.to ?? "",
  };
}

function normalizeMetricsApiParams(params: GetAdminMetricsParams = {}): GetAdminMetricsParams {
  return {
    granularity: params.granularity ?? 'day',
    from: params.from || undefined,
    to: params.to || undefined,
  };
}

export function useAdminMetrics(
  params: GetAdminMetricsParams = {},
  options: UseAdminMetricsOptions = {}
) {
  const router = useRouter();
  const isEnabled = options.enabled ?? true;
  const keyParams = useMemo(() => buildMetricsQueryKeyParams(params), [params]);
  const apiParams = useMemo(() => normalizeMetricsApiParams(params), [params]);
  const redirectedRef = useRef(false);

  const query = useQuery<AdminMetricsResult, BackendApiError>({
    queryKey: [ADMIN_METRICS_QUERY_BASE_KEY, keyParams],
    queryFn: () => getAdminMetrics(apiParams),
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    if (!query.error || !isBackendApiError(query.error) || query.error.status !== 401) {
      return;
    }

    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    router.replace('/auth/login?session=expired');
  }, [isEnabled, query.error, router]);

  const isLoadingState = query.status === "pending" || query.isLoading;
  const hasNoTimeseries = !isLoadingState && !query.isError && (query.data?.data.timeseries.length ?? 0) === 0;
  const state = isLoadingState ? 'loading' : query.isError ? 'error' : hasNoTimeseries ? 'empty' : 'success';

  return {
    ...query,
    isEmpty: hasNoTimeseries,
    state,
  };
}
