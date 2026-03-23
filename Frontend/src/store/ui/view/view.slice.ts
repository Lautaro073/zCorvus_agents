import { initialUIState } from "./view.initial";
import { uiActions } from "./view.actions";
import type { UISliceStore } from "./view.types";

export const createUISlice: UISliceStore = (set, get) => ({
  ...initialUIState,
  ...uiActions(set, get),
}); 