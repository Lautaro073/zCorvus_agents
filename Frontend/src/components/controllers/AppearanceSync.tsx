"use client";

import { useEffect } from "react";
import { useUIStoreApi } from "@/store";
import { shallow } from "zustand/shallow";

const AppearanceSync = () => {
  const store = useUIStoreApi()

  useEffect(() => {
    const unsub = store.subscribe(
      (state) => ({
        iconSet: state.iconSet,
        layer: state.layer,
        theme: state.theme,
      }),
      async (prefs) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(prefs.theme);
        await fetch("/api/preferences", {
          method: "POST",
          body: JSON.stringify(prefs),
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
      { equalityFn: shallow }
    );

    return () => unsub();
  }, [store]);


  return null;
};

export { AppearanceSync };
