import { StateCreator } from "zustand"

export type Store<T> = StateCreator<
  T,
  [
    ["zustand/subscribeWithSelector", never],
    ["zustand/devtools", never],
    ["zustand/immer", never]
  ]
>;
