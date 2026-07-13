"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSessionUser } from "./auth";
import { loadAppSnapshot } from "./db";
import { supabase, supabaseConfigured } from "./supabase";
import type { AppState } from "./types";

const emptyState: AppState = {
  users: [],
  currentUserId: undefined,
  workStatuses: {},
  workStatusUpdatedAt: {},
  reviews: [],
  picks: [],
};

type AllbluContextValue = {
  state: AppState;
  ready: boolean;
  refresh: () => Promise<void>;
};

const AllbluContext = createContext<AllbluContextValue | null>(null);

export function AllbluProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) {
      setState(emptyState);
      setReady(true);
      return;
    }
    try {
      const user = await getSessionUser();
      const snapshot = await loadAppSnapshot(user);
      setState(snapshot);
    } catch (error) {
      console.error("Failed to load ALLBLU state", error);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onChange = () => {
      void refresh();
    };
    window.addEventListener("allblu-state-change", onChange);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      window.removeEventListener("allblu-state-change", onChange);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ state, ready, refresh }),
    [state, ready, refresh]
  );

  return (
    <AllbluContext.Provider value={value}>{children}</AllbluContext.Provider>
  );
}

export function useAllbluState() {
  const ctx = useContext(AllbluContext);
  if (!ctx) {
    throw new Error("useAllbluState must be used within AllbluProvider");
  }
  return ctx;
}
