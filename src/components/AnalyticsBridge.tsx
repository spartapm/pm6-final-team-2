"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView, trackUserContext } from "@/lib/analytics";
import { useAllbluState } from "@/lib/useAllbluState";

/** SPA page_view + 회원 식별 컨텍스트 */
export default function AnalyticsBridge() {
  const pathname = usePathname() ?? "/";
  const { state, ready } = useAllbluState();
  const lastPathRef = useRef<string | null>(null);
  const lastUserRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    // title이 라우트 후 갱신되도록 한 틱 뒤 전송
    const t = window.setTimeout(() => {
      trackPageView(pathname);
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    const userId = state.currentUserId ?? null;
    if (lastUserRef.current === userId) return;
    lastUserRef.current = userId;
    trackUserContext(userId);
  }, [ready, state.currentUserId]);

  return null;
}
