import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
} from "@/lib/preferences/contract";
import type { InitialUIState, UIState } from "./view.types";

export function createInitialUIState(initialState: Partial<InitialUIState> = {}): UIState {
  const resolved = normalizeUserPreferences({
    ...DEFAULT_USER_PREFERENCES,
    ...initialState,
  });

  return {
    ...resolved,
    hasHydrated: false,
  };
}
