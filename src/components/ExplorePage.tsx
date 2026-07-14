"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppShell from "./AppShell";
import SectionCarousel from "./SectionCarousel";
import SectionHeading, { sectionIcons } from "./SectionHeading";
import Spinner from "./Spinner";
import WorkThumbnail from "./WorkThumbnail";
import {
  groupOngoingWebtoonsBySerialDay,
  isCompletedStatus,
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

/** 애니 전체 / 웹툰 완결: 가로6×세로5 = 30, 이후 30개씩 무한스크롤 */
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
  const isGrid = type === "anime" ? tab === "all" : tab === "done";

  const filtered = useMemo(() => {
    let list = all;
    if (type === "webtoon" && tab === "done") {
      list = all.filter((work) => isCompletedStatus(work.statusLabel));
    }
    if (isGrid && genreFilter !== "전체") {
      list = list.filter((work) => work.genres.includes(genreFilter));
    }
    return list;
  }, [all, genreFilter, isGrid, tab, type]);

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

  const webtoonDaySections = useMemo(
    () => (type === "webtoon" ? groupOngoingWebtoonsBySerialDay(all) : []),
    [all, type, worksRevision]
  );

  const buildQuery = useCallback(
    (next: { tab?: string; genre?: string; n?: number }) => {
      const params = new URLSearchParams();
      const nextTab = next.tab ?? tab;
      const nextGenre = next.genre ?? genreFilter;
      const nextN = next.n ?? count;
      if (nextTab !== defaultTab(type)) params.set("tab", nextTab);
      if (nextGenre !== "전체") params.set("genre", nextGenre);
      if (nextTab === "all" || nextTab === "done") {
        if (nextN > GRID_PAGE_SIZE) params.set("n", String(nextN));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [tab, genreFilter, count, type, pathname]
  );

  const pushExploreUrl = useCallback(
    (next: { tab?: string; genre?: string; n?: number }) => {
      router.push(buildQuery(next), { scroll: false });
    },
    [router, buildQuery]
  );

  /** URL tab/genre 변경 시 count·스크롤 복원 플래그 리셋 */
  useEffect(() => {
    const fromUrl =
      Number.isFinite(countParam) && countParam >= GRID_PAGE_SIZE
        ? countParam
        : GRID_PAGE_SIZE;
    setCount(fromUrl);
    scrollRestoredRef.current = false;
    skipCountUrlSyncRef.current = true;
  }, [tab, genreFilter, type, countParam]);

  /** 무한스크롤 count → URL (같은 히스토리 엔트리만 갱신, 스크롤 유지) */
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

  /** 작품 상세로 나갈 때 스크롤 저장 */
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
  }, [pathname, tab, genreFilter, count]);

  /** 뒤로가기 복귀 시 스크롤 복원 (그리드 아이템 렌더 후) */
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
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, saved);
      document.documentElement.style.scrollBehavior = prev;
      scrollRestoredRef.current = true;
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    };

    // 레이아웃·이미지 높이 반영을 위해 두 프레임 대기
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname, tab, genreFilter, count, filtered.length, isGrid]);

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
                onClick={() => {
                  setCount(GRID_PAGE_SIZE);
                  pushExploreUrl({
                    tab: item.id,
                    genre: "전체",
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
            genreFilter={genreFilter}
            genreFilters={genreFilters}
            onGenreFilterChange={(genre) => {
              setCount(GRID_PAGE_SIZE);
              pushExploreUrl({ genre, n: GRID_PAGE_SIZE });
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
        ) : (
          <div className="space-y-5">
            {webtoonDaySections.map((section) => (
              <PlatformSection
                key={section.code}
                title={section.label}
                works={section.works}
                userId={state.currentUserId}
                statuses={userStatuses}
                ratingStats={ratingStats}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CatalogGrid({
  works,
  count,
  genreFilter,
  genreFilters,
  onGenreFilterChange,
  userId,
  statuses,
  ratingStats,
  loadingMore,
  sentinelRef,
}: {
  works: Work[];
  count: number;
  genreFilter: string;
  genreFilters: string[];
  onGenreFilterChange: (genre: string) => void;
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
        {genreFilters.map((item) => {
          const active = genreFilter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onGenreFilterChange(item)}
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

function PlatformSection({
  title,
  icon,
  works,
  userId,
  statuses,
  ratingStats,
}: {
  title: string;
  icon?: string;
  works: Work[];
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
  ratingStats?: Map<string, import("@/lib/ratings").WorkRatingStats>;
}) {
  return (
    <section className="section-card">
      <SectionHeading title={title} icon={icon} className="mb-4" />
      {works.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {works.map((work) => (
            <WorkThumbnail
              key={work.id}
              work={work}
              userId={userId}
              status={statuses[work.id]}
              averageRating={ratingStats?.get(work.id)?.average ?? 0}
              compact
              metaMode="status"
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          등록된 작품이 없어요
        </p>
      )}
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
