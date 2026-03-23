"use client"
import { type ReactNode, createContext, useContext, useState } from "react";
import { uiStore, UIStore, UIStoreState } from './ui.store'
import { useStore } from "zustand";

export const UIContext = createContext<UIStore | null>(null)

export interface AppStoreProviderProps {
  children: ReactNode;
  initialState?: Partial<UIStoreState>
}

export const UIStoreProvider = ({ children, initialState }: AppStoreProviderProps) => {
  const [store] = useState(() => uiStore(initialState))

  return (
    <UIContext.Provider value={store}>
      {children}
    </UIContext.Provider>
  )
}

export const useUIStore = <T,>(selector: (state: UIStoreState) => T): T => {
  const uiStoreContext = useContext(UIContext);

  if (!uiStoreContext) {
    throw new Error('useUIStore must be used within a UIStoreProvider');
  }

  return useStore(uiStoreContext, selector);
}

export const useUIStoreApi = () => {
  const uiStoreContext = useContext(UIContext);

  if (!uiStoreContext) {
    throw new Error('useUIStoreApi must be used within a UIStoreProvider');
  }

  return uiStoreContext;
}