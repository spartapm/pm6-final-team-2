"use client";

import { useEffect, useState } from "react";

let notify: (message: string) => void = () => {};

export function showToast(message: string) {
  notify(message);
}

export default function Toast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    notify = (next) => {
      setMessage(next);
      window.setTimeout(() => setMessage(""), 2800);
    };
    return () => {
      notify = () => {};
    };
  }, []);

  if (!message) return null;

  const needsAuth = message.includes("로그인");

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-xl bg-brandDeep px-5 py-3 text-center text-sm font-bold text-white shadow-menu">
      {message}
      {needsAuth ? (
        <div className="mt-2 flex justify-center gap-2">
          <a href="/login" className="rounded bg-white/15 px-3 py-1 text-xs">
            로그인
          </a>
          <a href="/signup" className="rounded bg-white px-3 py-1 text-xs text-brandDeep">
            회원가입
          </a>
        </div>
      ) : null}
    </div>
  );
}
