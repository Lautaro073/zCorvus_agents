"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BackendApiError,
  type GetAdminSubscriptionsParams,
  type AdminSubscriptionsResult,
  getAdminSubscriptions,
  isBackendApiError,
} from "@/lib/api/backend";
import { useRouter } from "@/i18n/navigation";

const ADMIN_SUBSCRIPTIONS_QUERY_BASE_KEY = "admin-subscriptions";

interface UseAdminSubscriptionsOptions {
  enabled?: boolean;
}

function buildSubscriptionsQueryKeyParams(params: GetAdminSubscriptionsParams = {}) {
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    status: params.status ?? "",
    planType: params.planType ?? "",
    expiringInDays: params.expiringInDays ?? 7,
    from: params.from ?? "",
    to: params.to ?? "",
  };
}

function normalizeSubscriptionsApiParams(
  params: GetAdminSubscriptionsParams = {}
): GetAdminSubscriptionsParams {
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    status: params.status,
    planType: params.planType,
    expiringInDays: params.expiringInDays ?? 7,
    from: params.from || undefined,
    to: params.to || undefined,
  };
}

export function useAdminSubscriptions(
  params: GetAdminSubscriptionsParams = {},
  options: UseAdminSubscriptionsOptions = {}
) {
  const router = useRouter();
  const isEnabled = options.enabled ?? true;
  const keyParams = useMemo(() => buildSubscriptionsQueryKeyParams(params), [params]);
  const apiParams = useMemo(() => normalizeSubscriptionsApiParams(params), [params]);
  const redirectedRef = useRef(false);

  const query = useQuery<AdminSubscriptionsResult, BackendApiError>({
    queryKey: [ADMIN_SUBSCRIPTIONS_QUERY_BASE_KEY, keyParams],
    queryFn: () => getAdminSubscriptions(apiParams),
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
  const isEmpty = !isLoadingState && !query.isError && (query.data?.data.length ?? 0) === 0;
  const state = isLoadingState ? 'loading' : query.isError ? 'error' : isEmpty ? 'empty' : 'success';

  return {
    ...query,
    isEmpty,
    state,
  };
}
