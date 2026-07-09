"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  showMeta = true,
  metaMode = "rating",
}: {
  work: Work;
  status?: WorkStatus;
  userId?: string;
  rank?: number;
  compact?: boolean;
  showMeta?: boolean;
  metaMode?: "rating" | "genre" | "status" | "library";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const meta = statusMeta(status);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const choose = (code: StatusAction) => {
    if (!userId) {
      showToast("로그인이 필요한 기능입니다");
      setOpen(false);
      return;
    }
    void setWorkStatus(userId, work.id, code === "CANCEL" ? undefined : code);
    setOpen(false);
  };

  return (
    <article ref={rootRef} className="relative min-w-0">
      <div className="relative">
        <Link href={`/works/${work.id}`} className="block">
          <div
            className={`thumbnail-ratio relative overflow-hidden rounded-thumb bg-gradient-to-br ${work.coverTone}`}
          >
            {work.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={work.thumbnailUrl}
                alt={work.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
            {rank ? (
              <span className="absolute left-2 top-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-black text-white shadow-sm">
                {rank}
              </span>
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(15,23,42,0.08))]" />
          </div>
        </Link>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-menu"
          aria-label="상태 설정"
        >
          {meta ? <span className="text-sm leading-none">{meta.icon}</span> : <PlusIcon />}
        </button>

        {open ? (
          <div className="absolute bottom-12 right-0 z-30 w-[148px] overflow-hidden rounded-xl border border-line bg-white text-sm shadow-menu">
            {statusOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => choose(option.code)}
                className="flex w-full items-center justify-between border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-blueSoft"
              >
                <span className="flex items-center gap-2 font-bold">
                  <span className="text-base leading-none">{option.icon}</span>
                  {option.label}
                </span>
                {option.code === status ? <span className="text-brand">✓</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {showMeta ? (
        <Link href={`/works/${work.id}`} className="mt-2.5 block">
          {metaMode === "library" ? (
            <>
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                <span className="text-muted">{meta?.label ?? "상태없음"}</span>
                <span className="text-ink">
                  ★[{work.rating ? work.rating.toFixed(1) : "-"}]
                </span>
              </div>
              <h3 className="mt-1 line-clamp-1 text-center text-[13px] font-extrabold text-ink">
                [{work.title}]
              </h3>
            </>
          ) : (
            <>
              <h3
                className={`${compact ? "text-[13px]" : "text-sm"} line-clamp-1 font-extrabold text-ink`}
              >
                {work.title}
              </h3>
              <p className="mt-1 text-xs font-bold text-muted">
                {metaMode === "genre"
                  ? work.genres[0] ?? work.statusLabel
                  : metaMode === "status"
                    ? work.statusLabel
                    : `★ ${work.rating ? work.rating.toFixed(1) : "-/5"}`}
              </p>
            </>
          )}
        </Link>
      ) : null}
    </article>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
