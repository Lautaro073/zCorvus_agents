import { IconSets, LayerModes as LM } from "@/features/icons-explorer";
import type { UIActions, UISliceStore } from "./view.types";

export const uiActions = (
  set: Parameters<UISliceStore>[0],
  get: Parameters<UISliceStore>[1]
): UIActions => ({
  setIconSet: ({ iconSet }) =>
    set(
      (state) => {
        state.iconSet = iconSet;
      },
      false,
      "ui/setIconSet"
    ),

  setIconSetDynamic: () =>
    set(
      (state) => {
        // Solo ciclar entre iconos gratuitos en orden inverso (mina, neo, core)
        const freeIconSets = ["mina", "neo", "core"] as const;
        const currentIndex = freeIconSets.indexOf(state.iconSet as any);
        
        // Si el icono actual no está en los gratuitos, empezar desde el primero
        if (currentIndex === -1) {
          state.iconSet = freeIconSets[0];
        } else {
          state.iconSet = freeIconSets[(currentIndex + 1) % freeIconSets.length];
        }
      },
      false,
      "ui/setIconSetDynamic"
    ),

  setLayerDynamic: () => {
    const currentLayer = get().layer;
    set(
      (state) => {
        state.layer = currentLayer === LM.COMPACT ? LM.EXPANDED : LM.COMPACT
      },
      false,
      "ui/setLayer"
    )
  },

  setTheme: () =>
    set(
      (state) => {
        state.theme = state.theme === "dark" ? "light" : "dark";
      },
      false,
      "ui/setTheme"
    ),

  hydrate: (prefs) =>
    set((state) => {
      if (state.hasHydrated) return state;
      return {
        ...state,
        ...prefs,
        hasHydrated: true,
      };
    }, false, "ui/hydrate"),

});
