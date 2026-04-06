"use client";

import { useEffect } from "react";
import { useUIStoreApi } from "@/store";
import { shallow } from "zustand/shallow";
import {
  areUserPreferencesEqual,
  normalizeUserPreferences,
  type UserPreferences,
} from "@/lib/preferences/contract";

const selectPreferences = (state: {
  iconSet: UserPreferences["iconSet"];
  layer: UserPreferences["layer"];
  theme: UserPreferences["theme"];
}): UserPreferences =>
  normalizeUserPreferences({
    iconSet: state.iconSet,
    layer: state.layer,
    theme: state.theme,
  });

const applyThemeClass = (theme: UserPreferences["theme"]) => {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
};

const AppearanceSync = () => {
  const store = useUIStoreApi();

  useEffect(() => {
    let lastSynced = selectPreferences(store.getState());
    let isMounted = true;

    applyThemeClass(lastSynced.theme);

    const unsub = store.subscribe(
      selectPreferences,
      async (prefs) => {
        applyThemeClass(prefs.theme);

        if (areUserPreferencesEqual(lastSynced, prefs)) {
          return;
        }

        try {
          const response = await fetch("/api/preferences", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(prefs),
          });

          if (!response.ok) {
            throw new Error(`Failed to persist preferences: ${response.status}`);
          }

          const persisted = normalizeUserPreferences((await response.json()) as unknown);

          if (!isMounted) {
            return;
          }

          lastSynced = persisted;
          applyThemeClass(persisted.theme);
        } catch (error) {
          console.error("AppearanceSync failed to persist preferences", error);
        }
      },
      { equalityFn: shallow }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, [store]);

  return null;
};

export { AppearanceSync };
