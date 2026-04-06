import { createInitialUIState } from "./view.initial";
import { uiActions } from "./view.actions";
import type { InitialUIState, UISlice, UISliceStore } from "./view.types";

export const createUISlice = (
  set: Parameters<UISliceStore>[0],
  get: Parameters<UISliceStore>[1],
  _store: Parameters<UISliceStore>[2],
  initialState: Partial<InitialUIState> = {}
): UISlice => ({
  ...createInitialUIState(initialState),
  ...uiActions(set, get),
});
