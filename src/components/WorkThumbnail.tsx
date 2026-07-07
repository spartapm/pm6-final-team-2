"use client";

import Link from "next/link";
import { useState } from "react";
import { setWorkStatus } from "@/lib/store";
import { statusMeta, statusOptions } from "@/lib/works";
import { showToast } from "./Toast";
import type { StatusAction, Work, WorkStatus } from "@/lib/types";

export default function WorkThumbnail({
  work,
  status,
  userId,
  rank,
  compact = false,
}: {
  work: Work;
  status?: WorkStatus;
  userId?: string;
  rank?: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(status);

  const choose = (code: StatusAction) => {
    if (!userId) {
      showToast("로그인이 필요한 기능입니다");
      setOpen(false);
      return;
    }
    setWorkStatus(userId, work.id, code === "CANCEL" ? undefined : code);
    setOpen(false);
  };

  return (
    <article className="relative min-w-0">
      <Link href={`/works/${work.id}`} className="block">
        <div className={`thumbnail-ratio relative overflow-hidden rounded-xl bg-gradient-to-br ${work.coverTone}`}>
          {rank ? (
            <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-black text-white">
              {rank}
            </span>
          ) : null}
        </div>
        <div className="mt-2">
          <h3 className={`${compact ? "text-xs" : "text-sm"} line-clamp-1 font-extrabold text-ink`}>
            {work.title}
          </h3>
          <p className="mt-1 text-xs text-muted">★{work.rating ? work.rating.toFixed(1) : "-/5"}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="absolute bottom-9 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-navy text-lg font-light leading-none text-white shadow-menu"
        aria-label="상태 설정"
      >
        {meta?.icon ?? "+"}
      </button>
      {open && (
        <div className="absolute bottom-16 right-0 z-30 w-36 overflow-hidden rounded-xl border border-line bg-white text-sm shadow-menu">
          {statusOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => choose(option.code)}
              className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left last:border-0 hover:bg-blueSoft"
            >
              <span>
                <span className="mr-2">{option.icon}</span>
                {option.label}
              </span>
              {option.code === status ? <span>✓</span> : null}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
