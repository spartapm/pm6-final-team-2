"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppShell from "./AppShell";
import SectionCarousel from "./SectionCarousel";
import { sectionIcons } from "./SectionHeading";
import Spinner from "./Spinner";
import WorkThumbnail from "./WorkThumbnail";
import {
  WEBTOON_ONGOING_DAY_FILTERS,
  isCompletedStatus,
  matchesWebtoonOngoingDayFilter,
  topGenresForType,
  worksByType,
} from "@/lib/works";
import { buildRatingStatsMap } from "@/lib/ratings";
import { useAllbluState } from "@/lib/useAllbluState";
import type { Work, WorkType } from "@/lib/types";

const RANK_PERIODS = [
  { id: "realtime", label: "실시간" },
  { id: "weekly", label: "주간" },
  { id: "quarter", label: "분기" },
  { id: "yearly", label: "연간" },
] as const;

/** 애니 홈 캐러셀: 최초 6개, 좌우로 6개씩, 최대 20개 (무한스크롤 X) */
const HOME_CAROUSEL_PAGE = 6;
const HOME_CAROUSEL_MAX = 20;

/** 애니 전체 / 웹툰 연재중·완결: 가로6×세로5 = 30, 이후 30개씩 무한스크롤 */
const GRID_PAGE_SIZE = 30;

function defaultTab(type: WorkType) {
  return type === "anime" ? "recommend" : "ongoing";
}

function scrollStorageKey(pathname: string, search: string) {
  return `allblu:explore-scroll:${pathname}${search}`;
}

export default function ExplorePage({ type }: { type: WorkType }) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="px-5 py-16 text-center text-sm text-muted">불러오는 중…</div>
        </AppShell>
      }
    >
      <ExplorePageInner type={type} />
    </Suspense>
  );
}

function ExplorePageInner({ type }: { type: WorkType }) {
  const { state, worksRevision } = useAllbluState();
  const router = useRouter();
  const pathname = usePathname() ?? (type === "anime" ? "/anime" : "/webtoon");
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") || defaultTab(type);
  const genreFilter = searchParams.get("genre") || "전체";
  const dayFilter = searchParams.get("day") || "ALL";
  const countParam = Number(searchParams.get("n") || "");
  const [count, setCount] = useState(
    Number.isFinite(countParam) && countParam >= GRID_PAGE_SIZE
      ? countParam
      : GRID_PAGE_SIZE
  );
  const [rankPeriod, setRankPeriod] = useState<(typeof RANK_PERIODS)[number]["id"]>("realtime");
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRestoredRef = useRef(false);
  const skipCountUrlSyncRef = useRef(true);

  const userStatuses = state.currentUserId ? state.workStatuses[state.currentUserId] ?? {} : {};
  const ratingStats = useMemo(
    () => buildRatingStatsMap(state.reviews),
    [state.reviews]
  );
  const all = useMemo(() => worksByType(type), [type, worksRevision]);
  const genreFilters = useMemo(
    () => ["전체", ...topGenresForType(type)],
    [type, worksRevision]
  );
  const dayFilters = useMemo(
    () => WEBTOON_ONGOING_DAY_FILTERS.map((item) => ({ id: item.id, label: item.label })),
    []
  );
  const isWebtoonOngoing = type === "webtoon" && tab === "ongoing";
  const isWebtoonDone = type === "webtoon" && tab === "done";
  const isGrid =
    type === "anime" ? tab === "all" : isWebtoonOngoing || isWebtoonDone;

  const filtered = useMemo(() => {
    if (isWebtoonDone) {
      let list = all.filter((work) => isCompletedStatus(work.statusLabel));
      if (genreFilter !== "전체") {
        list = list.filter((work) => work.genres.includes(genreFilter));
      }
      return list;
    }
    if (isWebtoonOngoing) {
      return all.filter((work) => matchesWebtoonOngoingDayFilter(work, dayFilter));
    }
    if (type === "anime" && tab === "all" && genreFilter !== "전체") {
      return all.filter((work) => work.genres.includes(genreFilter));
    }
    return all;
  }, [all, dayFilter, genreFilter, isWebtoonDone, isWebtoonOngoing, tab, type]);

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
  }, [all, rankPeriod, type, worksRevision]);

  const buildQuery = useCallback(
    (next: { tab?: string; genre?: string; day?: string; n?: number }) => {
      const params = new URLSearchParams();
      const nextTab = next.tab ?? tab;
      const nextGenre = next.genre ?? genreFilter;
      const nextDay = next.day ?? dayFilter;
      const nextN = next.n ?? count;
      if (nextTab !== defaultTab(type)) params.set("tab", nextTab);
      if (nextTab === "done" || (type === "anime" && nextTab === "all")) {
        if (nextGenre !== "전체") params.set("genre", nextGenre);
      }
      if (type === "webtoon" && nextTab === "ongoing" && nextDay !== "ALL") {
        params.set("day", nextDay);
      }
      if (
        (type === "anime" && nextTab === "all") ||
        (type === "webtoon" && (nextTab === "done" || nextTab === "ongoing"))
      ) {
        if (nextN > GRID_PAGE_SIZE) params.set("n", String(nextN));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [tab, genreFilter, dayFilter, count, type, pathname]
  );

  const pushExploreUrl = useCallback(
    (next: { tab?: string; genre?: string; day?: string; n?: number }) => {
      router.push(buildQuery(next), { scroll: false });
    },
    [router, buildQuery]
  );

  useEffect(() => {
    const fromUrl =
      Number.isFinite(countParam) && countParam >= GRID_PAGE_SIZE
        ? countParam
        : GRID_PAGE_SIZE;
    setCount(fromUrl);
    scrollRestoredRef.current = false;
    skipCountUrlSyncRef.current = true;
  }, [tab, genreFilter, dayFilter, type, countParam]);

  useEffect(() => {
    if (!isGrid) return;
    if (skipCountUrlSyncRef.current) {
      skipCountUrlSyncRef.current = false;
      return;
    }
    const url = buildQuery({ n: count });
    window.history.replaceState(window.history.state, "", url);
  }, [count, isGrid, buildQuery]);

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

  useEffect(() => {
    const key = scrollStorageKey(pathname, window.location.search);
    const save = () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch {
        /* ignore */
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("/works/")) save();
    };

    window.addEventListener("pagehide", save);
    document.addEventListener("click", onClick, true);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname, tab, genreFilter, dayFilter, count]);

  useEffect(() => {
    if (scrollRestoredRef.current) return;
    const key = scrollStorageKey(pathname, window.location.search);
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(key) || "");
    } catch {
      saved = 0;
    }
    if (!Number.isFinite(saved) || saved <= 0) {
      scrollRestoredRef.current = true;
      return;
    }

    const restore = () => {
      window.scrollTo(0, saved);
      scrollRestoredRef.current = true;
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    };

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname, tab, genreFilter, dayFilter, count, filtered.length, isGrid]);

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

  const gridChips = isWebtoonOngoing
    ? dayFilters
    : genreFilters.map((label) => ({ id: label, label }));
  const activeChip = isWebtoonOngoing ? dayFilter : genreFilter;

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
                onClick={() => {
                  setCount(GRID_PAGE_SIZE);
                  pushExploreUrl({
                    tab: item.id,
                    genre: "전체",
                    day: "ALL",
                    n: GRID_PAGE_SIZE,
                  });
                }}
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
            chipFilter={activeChip}
            chipFilters={gridChips}
            onChipFilterChange={(chipId) => {
              setCount(GRID_PAGE_SIZE);
              if (isWebtoonOngoing) {
                pushExploreUrl({ day: chipId, n: GRID_PAGE_SIZE });
              } else {
                pushExploreUrl({ genre: chipId, n: GRID_PAGE_SIZE });
              }
            }}
            userId={state.currentUserId}
            statuses={userStatuses}
            ratingStats={ratingStats}
            loadingMore={loadingMore}
            sentinelRef={sentinelRef}
          />
        ) : type === "anime" && animeHomeSections ? (
          <div className="space-y-5">
            <SectionCarousel
              title="인기작 순위 TOP 20"
              icon={sectionIcons.bigWave}
              works={animeHomeSections.rank}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
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
              title="완결·종료 애니"
              icon={sectionIcons.anchor}
              works={animeHomeSections.completed}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              pageSize={HOME_CAROUSEL_PAGE}
            />
            <SectionCarousel
              title="방영 중·공개 예정"
              icon={sectionIcons.sunrise}
              works={animeHomeSections.newSeason}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              pageSize={HOME_CAROUSEL_PAGE}
            />
            <SectionCarousel
              title="최근 추가된 작품"
              icon={sectionIcons.dropletNew}
              works={animeHomeSections.recent}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              pageSize={HOME_CAROUSEL_PAGE}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function CatalogGrid({
  works,
  count,
  chipFilter,
  chipFilters,
  onChipFilterChange,
  userId,
  statuses,
  ratingStats,
  loadingMore,
  sentinelRef,
}: {
  works: Work[];
  count: number;
  chipFilter: string;
  chipFilters: { id: string; label: string }[];
  onChipFilterChange: (chipId: string) => void;
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
  ratingStats?: Map<string, import("@/lib/ratings").WorkRatingStats>;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
}) {
  const visible = works.slice(0, count);

  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-2">
        {chipFilters.map((item) => {
          const active = chipFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChipFilterChange(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? "bg-brand text-white"
                  : "bg-blueSoft text-brand hover:bg-[#dce8ff]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
          조건에 맞는 작품이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8">
          {visible.map((work) => (
            <WorkThumbnail
              key={work.id}
              work={work}
              userId={userId}
              status={statuses[work.id]}
              averageRating={ratingStats?.get(work.id)?.average ?? 0}
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
