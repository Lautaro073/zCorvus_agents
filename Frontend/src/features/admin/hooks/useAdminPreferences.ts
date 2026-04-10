"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BackendApiError,
  getAdminPreferences,
  isBackendApiError,
  type AdminPreferencesResult,
  type UpdateAdminPreferencesPayload,
  updateAdminPreferences,
} from "@/lib/api/backend";
import { useRouter } from "@/i18n/navigation";

const ADMIN_PREFERENCES_QUERY_BASE_KEY = "admin-preferences";

interface UseAdminPreferencesOptions {
  enabled?: boolean;
}

export function useAdminPreferences(options: UseAdminPreferencesOptions = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEnabled = options.enabled ?? true;
  const redirectedRef = useRef(false);

  const query = useQuery<AdminPreferencesResult, BackendApiError>({
    queryKey: [ADMIN_PREFERENCES_QUERY_BASE_KEY],
    queryFn: () => getAdminPreferences(),
    enabled: isEnabled,
  });

  const saveMutation = useMutation<AdminPreferencesResult, BackendApiError, UpdateAdminPreferencesPayload>({
    mutationFn: (payload) => updateAdminPreferences(payload),
    onSuccess: (result) => {
      queryClient.setQueryData([ADMIN_PREFERENCES_QUERY_BASE_KEY], result);
    },
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const candidateError = query.error ?? saveMutation.error;
    if (!candidateError || !isBackendApiError(candidateError) || candidateError.status !== 401) {
      return;
    }

    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    router.replace('/auth/login?session=expired');
  }, [isEnabled, query.error, router, saveMutation.error]);

  const isLoadingState = query.status === "pending" || query.isLoading;
  const state = isLoadingState
    ? 'loading'
    : query.isError
      ? 'error'
      : 'success';

  return {
    ...query,
    savePreferences: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    state,
  };
}
