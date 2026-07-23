"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BADGE_CATEGORIES,
  buildActivityStats,
  emptyStateCopy,
  evaluateBadges,
  representativeBadgeName,
  type BadgeCategory,
  type BadgeIconId,
  type BadgeView,
} from "@/lib/badges";
import type { WorkStatus } from "@/lib/types";

export default function BadgeCollection({
  statuses,
  pickCount,
  reviewCount,
  isOwnProfile,
  onRepresentativeChange,
}: {
  statuses: Record<string, WorkStatus>;
  pickCount: number;
  reviewCount: number;
  isOwnProfile: boolean;
  onRepresentativeChange?: (badgeLabel: string) => void;
}) {
  const [category, setCategory] = useState<BadgeCategory>("service");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selected, setSelected] = useState<BadgeView | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(
    () => buildActivityStats({ statuses, pickCount, reviewCount }),
    [statuses, pickCount, reviewCount]
  );
  const badges = useMemo(() => evaluateBadges(stats), [stats]);
  const earnedCount = badges.filter((badge) => badge.earned).length;
  const totalCount = badges.length;
  const progressPct = totalCount ? Math.round((earnedCount / totalCount) * 100) : 0;
  const representative = badges.find((badge) => badge.isRepresentative);
  const categoryLabel =
    BADGE_CATEGORIES.find((item) => item.id === category)?.label ?? "서비스 이용";

  useEffect(() => {
    if (!isOwnProfile || !onRepresentativeChange || !representative) return;
    onRepresentativeChange(representativeBadgeName(badges));
  }, [badges, isOwnProfile, onRepresentativeChange, representative]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!categoryRef.current?.contains(event.target as Node)) {
        setCategoryOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">내 배지 컬렉션 ✨</h2>
              <p className="mt-1 text-sm text-muted">
                활동을 통해 다양한 배지를 모아보세요!
              </p>
            </div>
            <div className="min-w-[200px] text-right">
              <p className="text-sm font-bold text-ink">
                획득한 배지{" "}
                <span className="text-brand">
                  {earnedCount} / {totalCount}
                </span>
              </p>
              <p className="mt-1 text-xs font-bold text-muted">
                전체 컬렉션 진행률 {progressPct}%
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8eef8]">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm font-black text-ink">카테고리별 현황</p>
            <div ref={categoryRef} className="relative">
              <button
                type="button"
                onClick={() => setCategoryOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-bold text-ink hover:border-brand/40"
              >
                {categoryLabel}
                <span className="text-xs text-muted">▾</span>
              </button>
              {categoryOpen ? (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[140px] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-menu">
                  {BADGE_CATEGORIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCategory(item.id);
                        setCategoryOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm font-bold hover:bg-blueSoft ${
                        category === item.id ? "bg-blueSoft text-brand" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {category === "service" ? (
            <div className="relative">
              <div className="mb-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-sm font-bold text-muted hover:text-ink"
                  aria-label="이전 배지"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-sm font-bold text-muted hover:text-ink"
                  aria-label="다음 배지"
                >
                  ›
                </button>
              </div>
              <div
                ref={scrollerRef}
                className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
              >
                {badges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    onClick={() => setSelected(badge)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyCategoryState category={category} />
          )}
        </section>

        <section className="rounded-2xl border border-brand/20 bg-gradient-to-r from-blueSoft to-white px-5 py-5 shadow-sm">
          <p className="text-base font-black text-ink">
            🎁 배지를 모아보세요!
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            다양한 활동을 통해 특별한 배지를 수집하고, 나만의 컬렉션을 완성해보세요.
          </p>
          <p className="mt-3 text-xs text-muted">
            ※ 배지 획득 조건은 서비스 운영 정책에 따라 변경될 수 있어요.
          </p>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-black">배지 안내</h3>
        <ul className="space-y-4">
          <GuideItem
            icon="⭐"
            title="다양한 배지 수집"
            body="작품 저장·추천·평가 활동으로 다양한 배지를 얻을 수 있어요."
          />
          <GuideItem
            icon="⬆️"
            title="대표 배지 성장"
            body="서비스 이용 조건을 달성하면 대표 배지가 더 높은 등급으로 올라가요."
          />
          <GuideItem
            icon="🏆"
            title="나만의 컬렉션"
            body="앞으로 추가될 업적 배지를 모아 나만의 컬렉션을 완성해보세요."
          />
        </ul>
        <div className="mt-5 rounded-xl border border-dashed border-brand/30 bg-blueSoft/70 px-3 py-3 text-xs font-bold leading-relaxed text-brandDeep">
          🔒 더 많은 배지를 기대해주세요! 새로운 배지는 계속 추가될 예정이에요.
        </div>
      </aside>

      {selected ? (
        <BadgeDetailModal badge={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function BadgeCard({
  badge,
  onClick,
}: {
  badge: BadgeView;
  onClick: () => void;
}) {
  const locked = !badge.earned;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-[200px] shrink-0 flex-col rounded-2xl border bg-white p-4 text-left transition hover:shadow-card ${
        badge.isRepresentative
          ? "border-brand ring-2 ring-brand/20"
          : locked
            ? "border-line"
            : "border-brand/30"
      }`}
    >
      <StatusPill
        earned={badge.earned}
        representative={badge.isRepresentative}
      />
      <div
        className={`mx-auto my-4 flex h-16 w-16 items-center justify-center rounded-full ${
          locked ? "bg-[#eef0f4] grayscale" : "bg-blueSoft"
        }`}
      >
        <BadgeIcon id={badge.icon} locked={locked} />
      </div>
      <p className="text-sm font-black text-ink">{badge.name}</p>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted">
        {badge.description}
      </p>
      <p
        className={`mt-3 text-xs font-bold ${
          locked ? "text-muted" : "text-brand"
        }`}
      >
        {locked ? "달성 조건 보기" : "달성 완료"}
      </p>
    </button>
  );
}

function StatusPill({
  earned,
  representative,
}: {
  earned: boolean;
  representative: boolean;
}) {
  if (representative) {
    return (
      <span className="inline-flex w-fit items-center rounded-full bg-brand px-2.5 py-1 text-[11px] font-black text-white">
        대표 배지
      </span>
    );
  }
  if (earned) {
    return (
      <span className="inline-flex w-fit items-center rounded-full bg-brand px-2.5 py-1 text-[11px] font-black text-white">
        획득 완료
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[11px] font-black text-muted">
      🔒 잠김
    </span>
  );
}

function BadgeDetailModal({
  badge,
  onClose,
}: {
  badge: BadgeView;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-panel md:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${
                badge.earned ? "bg-blueSoft" : "bg-[#eef0f4] grayscale"
              }`}
            >
              <BadgeIcon id={badge.icon} locked={!badge.earned} large />
            </div>
            <div className="min-w-0">
              {badge.earned ? (
                <span className="inline-flex w-fit items-center rounded-full bg-brand px-2.5 py-1 text-[11px] font-black text-white">
                  획득 완료
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[11px] font-black text-muted">
                  🔒 잠김
                </span>
              )}
              <h3 className="mt-2 text-lg font-black text-ink">{badge.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {badge.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {badge.autoGrant ? (
          <p className="rounded-xl bg-blueSoft px-4 py-3 text-sm font-bold text-brandDeep">
            {badge.autoNote}
          </p>
        ) : (
          <div className="space-y-3">
            {badge.progress.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-bold text-ink">{item.label}</span>
                  <span className="font-bold text-muted">
                    {Math.min(item.current, item.target)} / {item.target}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#e8eef8]">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.round(item.ratio * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCategoryState({ category }: { category: BadgeCategory }) {
  const copy = emptyStateCopy(category);
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-[#f8fafc] px-6 py-10 text-center">
      <div className="mb-3 text-3xl" aria-hidden>
        🚧
      </div>
      <p className="text-sm font-black text-ink">{copy.title}</p>
      <p className="mt-1 text-xs font-bold text-muted">{copy.body}</p>
    </div>
  );
}

function GuideItem({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 text-base" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}

function BadgeIcon({
  id,
  locked,
  large = false,
}: {
  id: BadgeIconId;
  locked: boolean;
  large?: boolean;
}) {
  const size = large ? 40 : 32;
  const color = locked ? "#9ca3af" : "#1f5eff";
  const icons: Record<BadgeIconId, string> = {
    sailboat: "⛵",
    compass: "🧭",
    anchor: "⚓",
    wheel: "☸️",
    diamond: "💎",
    crown: "👑",
  };
  return (
    <span style={{ fontSize: size, lineHeight: 1, color }} aria-hidden>
      {icons[id]}
    </span>
  );
}
