"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { trackLoginRequiredShown, type BlockedFeature } from "@/lib/analytics";

let notify: (message: string) => void = () => {};

export function showToast(message: string) {
  notify(message);
}

/** 로그인 안내 노출 + login_required_shown */
export function showLoginRequired(blockedFeature: BlockedFeature) {
  trackLoginRequiredShown(blockedFeature);
  showToast("로그인이 필요한 기능입니다");
}

export default function Toast() {
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    notify = (next) => {
      setMessage(next);
      window.setTimeout(() => setMessage(""), 2800);
    };
    return () => {
      notify = () => {};
    };
  }, []);

  if (!mounted || !message) return null;

  const needsAuth = message.includes("로그인");

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-5"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-brandDeep px-8 py-6 text-center shadow-menu">
        <p className="text-base font-black leading-snug text-white md:text-lg">
          {message}
        </p>
        {needsAuth ? (
          <div className="mt-4 flex justify-center gap-3">
            <a
              href="/login"
              className="rounded-lg bg-white/15 px-5 py-2.5 text-sm font-bold text-white"
            >
              로그인
            </a>
            <a
              href="/signup"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-brandDeep"
            >
              회원가입
            </a>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
