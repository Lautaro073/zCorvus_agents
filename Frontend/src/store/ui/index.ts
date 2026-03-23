export { uiStore } from "./ui.store";

export type {
  InitialUIState,
  UIState,
  UIActions,
  UISlice,
  UISliceStore,
} from "./view/view.types";

export { useUIStoreApi, useUIStore } from "./ui.provider";