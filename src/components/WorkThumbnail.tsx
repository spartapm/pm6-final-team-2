"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { setWorkStatus } from "@/lib/store";
import {
  mapWorkStatus,
  trackArchiveStatusSave,
  type SaveSurface,
} from "@/lib/analytics";
import { statusBadgeSrc, statusIconSrc, statusMeta, statusOptions } from "@/lib/works";
import { showLoginRequired, showToast } from "./Toast";
import WorkCoverImage from "./WorkCoverImage";
import type { StatusAction, Work, WorkStatus } from "@/lib/types";

const MENU_WIDTH = 148;
const MENU_HEIGHT = 220;

export default function WorkThumbnail({
  work,
  status,
  userId,
  rank,
  compact = false,
  showMeta = true,
  metaMode = "rating",
  /** 유저 평가 평균 (미지정 시 0.0 — 카탈로그 더미 평점 사용 안 함) */
  averageRating = 0,
  /** Override default `/works/[id]` link (e.g. review detail). */
  href,
  /** Image is not a link — parent card handles navigation. */
  disableLink = false,
  saveSurface,
  onWorkOpen,
}: {
  work: Work;
  status?: WorkStatus;
  userId?: string;
  rank?: number;
  compact?: boolean;
  showMeta?: boolean;
  metaMode?: "rating" | "genre" | "status" | "library";
  averageRating?: number;
  href?: string;
  disableLink?: boolean;
  saveSurface?: SaveSurface;
  onWorkOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = statusMeta(status);
  const targetHref = href ?? `/works/${work.id}`;

  const updateMenuPos = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const openUp = rect.top >= MENU_HEIGHT + 12;
    const top = openUp ? rect.top - 8 - MENU_HEIGHT : rect.bottom + 8;
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );
    setMenuPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => updateMenuPos();
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  const choose = (code: StatusAction) => {
    if (!userId) {
      showLoginRequired("status_save");
      setOpen(false);
      return;
    }
    const prev = mapWorkStatus(status);
    const nextStatus = code === "CANCEL" ? undefined : code;
    const statusValue =
      code === "CANCEL" ? ("cancel" as const) : (mapWorkStatus(code) as Exclude<
        ReturnType<typeof mapWorkStatus>,
        "none"
      >);
    const surface: SaveSurface =
      saveSurface ?? (metaMode === "library" ? "mylib" : "thumbnail");

    void (async () => {
      try {
        await setWorkStatus(userId, work.id, nextStatus);
        trackArchiveStatusSave({
          workId: work.id,
          statusValue,
          prevStatus: prev,
          saveSurface: surface,
        });
      } catch {
        showToast("상태 저장에 실패했습니다");
      }
    })();
    setOpen(false);
  };

  const poster = (
    <div className="thumbnail-ratio relative overflow-hidden rounded-thumb bg-[#f3f4f6]">
      <WorkCoverImage src={work.thumbnailUrl} alt={work.title} />
      {rank ? (
        <span className="absolute left-2 top-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-black text-white shadow-sm">
          {rank}
        </span>
      ) : null}
      {/* Hover / menu-open dim — group/thumb only (avoid unrelated parent `.group`) */}
      <div
        className={`absolute inset-0 z-[1] bg-black/0 transition-colors duration-200 group-hover/thumb:bg-black/40 ${
          open ? "bg-black/45" : ""
        }`}
      />
    </div>
  );

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] w-[148px] overflow-hidden rounded-xl border border-line bg-white text-sm shadow-menu"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {statusOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => choose(option.code)}
                className="flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-blueSoft"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.icon}
                  alt=""
                  className="h-5 w-5 shrink-0 object-contain"
                  draggable={false}
                />
                <span className="font-bold">{option.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <article ref={rootRef} className="group/thumb relative min-w-0">
      <div className="relative">
        {disableLink ? (
          poster
        ) : (
          <Link
            href={targetHref}
            className="block"
            onClick={() => {
              onWorkOpen?.();
            }}
          >
            {poster}
          </Link>
        )}

        <button
          ref={buttonRef}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          className={`absolute bottom-2 right-2 z-20 flex shrink-0 items-center justify-center transition-transform duration-200 group-hover/thumb:scale-110 ${
            meta
              ? `h-9 w-9 overflow-hidden rounded-full bg-white shadow-menu ${open ? "scale-110" : ""}`
              : `h-8 w-8 rounded-full bg-brand text-white shadow-menu ${open ? "scale-110" : ""}`
          }`}
          aria-label="상태 설정"
          aria-expanded={open}
        >
          {meta ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={statusBadgeSrc(meta.code as StatusAction)}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <PlusIcon />
          )}
        </button>

        {menu}
      </div>

      {showMeta ? (
        <Link href={targetHref} className="mt-2.5 block">
          {metaMode === "library" ? (
            <>
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                <span className="text-muted">{meta?.label ?? "상태없음"}</span>
                <span className="text-ink">
                  ★[{averageRating.toFixed(1)}]
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
                    : `★ ${averageRating.toFixed(1)}`}
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
