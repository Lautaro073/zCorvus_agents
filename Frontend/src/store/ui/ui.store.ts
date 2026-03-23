import { createStore, Mutate, StoreApi } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer";
import { UISlice } from "./view/view.types";
import { createUISlice } from "./view/view.slice";

export type UIStoreState = UISlice;

export type UIStoreApi = Mutate<StoreApi<UIStoreState>, [["zustand/subscribeWithSelector", never]]>

export const uiStore = (initialState: Partial<UIStoreState> = {}): UIStoreApi => {
  return createStore<UIStoreState>()(
    subscribeWithSelector(
      devtools(
        immer((set, get, store) => ({
          ...createUISlice(set, get, store),
          ...initialState,
        }))
      )
    )
  )
}

export type UIStore = ReturnType<typeof uiStore>