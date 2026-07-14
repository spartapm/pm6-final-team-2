"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSessionUser } from "./auth";
import { loadAppSnapshot } from "./db";
import { supabase, supabaseConfigured } from "./supabase";
import type { AppState, Work } from "./types";
import { setWorksCatalog } from "./works";

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
  /** 작품 카탈로그 갱신 카운터 — worksByType 등 재계산용 */
  worksRevision: number;
  worksCatalogReady: boolean;
  refresh: () => Promise<void>;
};

const AllbluContext = createContext<AllbluContextValue | null>(null);

export function AllbluProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [worksRevision, setWorksRevision] = useState(0);
  const [worksCatalogReady, setWorksCatalogReady] = useState(false);
  /** 오래된 getSession 결과가 최신 로그아웃 상태를 덮어쓰지 않도록 */
  const refreshGen = useRef(0);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) {
      setState(emptyState);
      setReady(true);
      return;
    }
    const gen = ++refreshGen.current;
    try {
      const user = await getSessionUser();
      if (gen !== refreshGen.current) return;
      const snapshot = await loadAppSnapshot(user);
      if (gen !== refreshGen.current) return;
      setState(snapshot);
    } catch (error) {
      console.error("Failed to load ALLBLU state", error);
    } finally {
      if (gen === refreshGen.current) setReady(true);
    }
  }, []);

  const refreshWorksCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/works", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { works?: Work[] };
      if (data.works?.length) {
        setWorksCatalog(data.works);
        setWorksRevision((value) => value + 1);
      }
    } catch (error) {
      console.error("Failed to refresh works catalog from Google Sheet", error);
    } finally {
      setWorksCatalogReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshWorksCatalog();

    const onChange = () => {
      void refresh();
    };
    window.addEventListener("allblu-state-change", onChange);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // getSessionUser()가 force-guest면 undefined → 자동로그인 UI 방지
      void refresh();
    });

    return () => {
      window.removeEventListener("allblu-state-change", onChange);
      sub.subscription.unsubscribe();
    };
  }, [refresh, refreshWorksCatalog]);

  const value = useMemo(
    () => ({ state, ready, worksRevision, worksCatalogReady, refresh }),
    [state, ready, worksRevision, worksCatalogReady, refresh]
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
