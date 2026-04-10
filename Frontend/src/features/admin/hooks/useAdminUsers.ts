"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BackendApiError,
  type GetAdminUsersParams,
  type AdminUsersResult,
  getAdminUsers,
  isBackendApiError,
} from "@/lib/api/backend";
import { useRouter } from "@/i18n/navigation";

const ADMIN_USERS_QUERY_BASE_KEY = "admin-users";

interface UseAdminUsersOptions {
  enabled?: boolean;
  keepPreviousData?: boolean;
}

function buildUsersQueryKeyParams(params: GetAdminUsersParams = {}) {
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search ?? "",
    role: params.role ?? "",
    subscriptionStatus: params.subscriptionStatus ?? "",
    sortBy: params.sortBy ?? "id",
    sortDir: params.sortDir ?? "desc",
    expiringInDays: params.expiringInDays ?? 7,
  };
}

function normalizeUsersApiParams(params: GetAdminUsersParams = {}): GetAdminUsersParams {
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search || undefined,
    role: params.role,
    subscriptionStatus: params.subscriptionStatus,
    sortBy: params.sortBy ?? 'id',
    sortDir: params.sortDir ?? 'desc',
    expiringInDays: params.expiringInDays ?? 7,
  };
}

export function useAdminUsers(
  params: GetAdminUsersParams = {},
  options: UseAdminUsersOptions = {}
) {
  const router = useRouter();
  const isEnabled = options.enabled ?? true;
  const keyParams = useMemo(() => buildUsersQueryKeyParams(params), [params]);
  const apiParams = useMemo(() => normalizeUsersApiParams(params), [params]);
  const redirectedRef = useRef(false);

  const query = useQuery<AdminUsersResult, BackendApiError>({
    queryKey: [ADMIN_USERS_QUERY_BASE_KEY, keyParams],
    queryFn: () => getAdminUsers(apiParams),
    enabled: isEnabled,
    placeholderData: options.keepPreviousData ? (previousData) => previousData : undefined,
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
