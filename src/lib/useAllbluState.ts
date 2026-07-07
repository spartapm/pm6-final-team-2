"use client";

import { useEffect, useState } from "react";
import { defaultState, loadState } from "./store";
import type { AppState } from "./types";

export function useAllbluState() {
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setState(loadState());
    sync();
    setReady(true);
    window.addEventListener("storage", sync);
    window.addEventListener("allblu-state-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("allblu-state-change", sync);
    };
  }, []);

  return { state, ready };
}
