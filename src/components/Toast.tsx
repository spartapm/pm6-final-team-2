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
      window.setTimeout(() => setMessage(""), 2200);
    };
    return () => {
      notify = () => {};
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-xl bg-navy px-5 py-3 text-center font-bold text-white shadow-menu">
      {message}
    </div>
  );
}
