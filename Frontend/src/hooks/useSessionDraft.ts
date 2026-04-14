"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function useSessionDraft<T>(
  key: string,
  initialState: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialState;
    }

    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        return initialState;
      }

      const parsed = JSON.parse(raw) as T;

      if (isPlainObject(initialState) && isPlainObject(parsed)) {
        return { ...initialState, ...parsed } as T;
      }

      return parsed;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // noop
    }
  }, [key, state]);

  const clearDraft = useCallback(() => {
    setState(initialState);

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // noop
    }
  }, [initialState, key]);

  return [state, setState, clearDraft];
}
