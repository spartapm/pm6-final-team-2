"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "./AppShell";
import SectionCarousel from "./SectionCarousel";
import Spinner from "./Spinner";
import WorkThumbnail from "./WorkThumbnail";
import { isCompletedStatus, isOngoingStatus, worksByType } from "@/lib/works";
import { useAllbluState } from "@/lib/useAllbluState";
import type { Work, WorkType } from "@/lib/types";

/** CSV status 필터 (장르 데이터 없음) */
const ANIME_STATUS_FILTERS = ["전체", "방영 중", "방영 종료", "개봉", "공개 예정", "제작 중"];
const WEBTOON_STATUS_FILTERS = ["전체", "연재 중", "완결"];
const RANK_PERIODS = [
  { id: "realtime", label: "실시간" },
  { id: "weekly", label: "주간" },
  { id: "quarter", label: "분기" },
  { id: "yearly", label: "연간" },
] as const;

/** 애니 홈 캐러셀: 최초 6개, 좌우로 6개씩, 최대 20개 (무한스크롤 X) */
const HOME_CAROUSEL_PAGE = 6;
const HOME_CAROUSEL_MAX = 20;

/** 애니 전체 / 웹툰 완결: 가로6×세로5 = 30, 이후 30개씩 무한스크롤 */
const GRID_PAGE_SIZE = 30;

export default function ExplorePage({ type }: { type: WorkType }) {
  const { state } = useAllbluState();
  const [tab, setTab] = useState(type === "anime" ? "recommend" : "ongoing");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [rankPeriod, setRankPeriod] = useState<(typeof RANK_PERIODS)[number]["id"]>("realtime");
  const [count, setCount] = useState(GRID_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const userStatuses = state.currentUserId ? state.workStatuses[state.currentUserId] ?? {} : {};
  const all = worksByType(type);
  const statusFilters = type === "anime" ? ANIME_STATUS_FILTERS : WEBTOON_STATUS_FILTERS;
  const isGrid = type === "anime" ? tab === "all" : tab === "done";

  const filtered = useMemo(() => {
    let list = all;
    if (type === "webtoon" && tab === "done") {
      list = all.filter((work) => isCompletedStatus(work.statusLabel));
    }
    if (isGrid && statusFilter !== "전체") {
      list = list.filter((work) => work.statusLabel === statusFilter);
    }
    return list;
  }, [all, isGrid, statusFilter, tab, type]);

  const animeHomeSections = useMemo(() => {
    if (type !== "anime") return null;
    return {
      rank: shuffleBySeed(all, `anime-rank-${rankPeriod}`).slice(0, HOME_CAROUSEL_MAX),
      completed: all
        .filter((work) => isCompletedStatus(work.statusLabel))
        .slice(0, HOME_CAROUSEL_MAX),
      newSeason: all
        .filter((work) => work.statusLabel === "방영 중" || work.statusLabel === "공개 예정")
        .slice(0, HOME_CAROUSEL_MAX),
      recent: [...all].slice(0, HOME_CAROUSEL_MAX),
    };
  }, [all, rankPeriod, type]);

  const webtoonOngoing = useMemo(
    () => all.filter((work) => isOngoingStatus(work.statusLabel)),
    [all]
  );

  useEffect(() => {
    setCount(GRID_PAGE_SIZE);
    setStatusFilter("전체");
  }, [tab, type]);

  useEffect(() => {
    if (!isGrid) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (!hit || loadingMore || count >= filtered.length) return;
        setLoadingMore(true);
        window.setTimeout(() => {
          setCount((value) => Math.min(value + GRID_PAGE_SIZE, filtered.length));
          setLoadingMore(false);
        }, 350);
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [count, filtered.length, isGrid, loadingMore]);

  const primaryTabs =
    type === "anime"
      ? [
          { id: "recommend", label: "올블루 추천" },
          { id: "all", label: "전체" },
        ]
      : [
          { id: "ongoing", label: "연재중" },
          { id: "done", label: "완결" },
        ];

  return (
    <AppShell>
      <div className="px-5 py-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {primaryTabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-brand text-white shadow-sm"
                    : "border border-line bg-white text-ink hover:bg-surface"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {isGrid ? (
          <CatalogGrid
            works={filtered}
            count={count}
            statusFilter={statusFilter}
            statusFilters={statusFilters}
            onStatusFilterChange={setStatusFilter}
            userId={state.currentUserId}
            statuses={userStatuses}
            loadingMore={loadingMore}
            sentinelRef={sentinelRef}
          />
        ) : type === "anime" && animeHomeSections ? (
          <div className="space-y-5">
            <SectionCarousel
              title="🔥 인기작 순위 TOP 20"
              works={animeHomeSections.rank}
              userId={state.currentUserId}
              statuses={userStatuses}
              rank
              pageSize={HOME_CAROUSEL_PAGE}
              tabs={[...RANK_PERIODS]}
              activeTab={rankPeriod}
              onTabChange={(id) =>
                setRankPeriod(id as (typeof RANK_PERIODS)[number]["id"])
              }
              tabStyle="underline"
            />
            <SectionCarousel
              title="🎀 완결·종료 애니"
              works={animeHomeSections.completed}
              userId={state.currentUserId}
              statuses={userStatuses}
              pageSize={HOME_CAROUSEL_PAGE}
            />
            <SectionCarousel
              title="✨ 방영 중·공개 예정"
              works={animeHomeSections.newSeason}
              userId={state.currentUserId}
              statuses={userStatuses}
              pageSize={HOME_CAROUSEL_PAGE}
            />
            <SectionCarousel
              title="🆕 최근 추가된 작품"
              works={animeHomeSections.recent}
              userId={state.currentUserId}
              statuses={userStatuses}
              pageSize={HOME_CAROUSEL_PAGE}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <PlatformSection
              title="🟢 연재 중 웹툰"
              works={webtoonOngoing.slice(0, 48)}
              userId={state.currentUserId}
              statuses={userStatuses}
            />
            <PlatformSection
              title="📚 더 많은 연재작"
              works={webtoonOngoing.slice(48, 96)}
              userId={state.currentUserId}
              statuses={userStatuses}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CatalogGrid({
  works,
  count,
  statusFilter,
  statusFilters,
  onStatusFilterChange,
  userId,
  statuses,
  loadingMore,
  sentinelRef,
}: {
  works: Work[];
  count: number;
  statusFilter: string;
  statusFilters: string[];
  onStatusFilterChange: (status: string) => void;
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
}) {
  const visible = works.slice(0, count);

  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-2">
        {statusFilters.map((item) => {
          const active = statusFilter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onStatusFilterChange(item)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? "bg-brand text-white"
                  : "bg-blueSoft text-brand hover:bg-[#dce8ff]"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
          조건에 맞는 작품이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {visible.map((work) => (
            <WorkThumbnail
              key={work.id}
              work={work}
              userId={userId}
              status={statuses[work.id]}
              metaMode="status"
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {loadingMore ? (
        <div className="flex justify-center py-4">
          <Spinner compact />
        </div>
      ) : null}
    </section>
  );
}

function PlatformSection({
  title,
  works,
  userId,
  statuses,
}: {
  title: string;
  works: Work[];
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
}) {
  return (
    <section className="section-card">
      <h2 className="mb-4 text-lg font-black tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
        {works.slice(0, 24).map((work) => (
          <WorkThumbnail
            key={work.id}
            work={work}
            userId={userId}
            status={statuses[work.id]}
            compact
            metaMode="status"
          />
        ))}
      </div>
    </section>
  );
}

function shuffleBySeed(list: Work[], seed: string) {
  const copy = [...list];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  for (let i = copy.length - 1; i > 0; i -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
