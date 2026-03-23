import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools, subscribeWithSelector } from "zustand/middleware";

// import { createUISlice } from "./ui/ui.slice";
// import type { UISlice } from "./ui/ui.types";

// export type AppStore = UISlice;

// export const useAppStore = create<AppStore>()(
export const useAppStore = create()(
  subscribeWithSelector(
    devtools(
      immer((set, get, store) => ({
        // ...createUISlice(set, get, store),
      })),
      { name: "UIStore" }
    )
  )
);
