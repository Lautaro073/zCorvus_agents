import { LayerModes as LM } from "@/features/icons-explorer";
import type { UIActions, UIState } from "./view.types";

export const uiActions = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  get: () => UIState
): UIActions => ({
  setIconSet: ({ iconSet }) =>
    set(
      (state: UIState) => {
        state.iconSet = iconSet;
      }
    ),

  setIconSetDynamic: () =>
    set(
      (state: UIState) => {
        const freeIconSets = ["mina", "neo", "core"] as const;
        const currentIndex = freeIconSets.indexOf(state.iconSet as "mina" | "neo" | "core");
        
        if (currentIndex === -1) {
          state.iconSet = freeIconSets[0];
        } else {
          state.iconSet = freeIconSets[(currentIndex + 1) % freeIconSets.length];
        }
      }
    ),

  setLayerDynamic: () => {
    const currentLayer = get().layer;
    set(
      (state: UIState) => {
        state.layer = currentLayer === LM.COMPACT ? LM.EXPANDED : LM.COMPACT
      }
    )
  },

  setTheme: () =>
    set(
      (state: UIState) => {
        state.theme = state.theme === "dark" ? "light" : "dark";
      }
    ),

  hydrate: (prefs) =>
    set((state: UIState) => {
      if (state.hasHydrated) return;
      Object.assign(state, prefs);
      state.hasHydrated = true;
    }),

});