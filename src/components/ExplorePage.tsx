"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppShell from "./AppShell";
import SectionCarousel from "./SectionCarousel";
import { sectionIcons } from "./SectionHeading";
import Spinner from "./Spinner";
import WorkThumbnail from "./WorkThumbnail";
import {
  ANIME_STATUS_FILTERS,
  WEBTOON_DAY_FILTERS,
  WEBTOON_STATUS_FILTERS,
  genresForType,
  isCompletedStatus,
  matchesAnimeStatusFilter,
  matchesGenreFilters,
  matchesPlatformFilters,
  matchesWebtoonDayFilters,
  matchesWebtoonStatusFilter,
  platformsForType,
  worksByType,
  type AnimeStatusFilterId,
  type WebtoonStatusFilterId,
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

/** 홈 캐러셀: 최초 6개, 좌우로 6개씩, 최대 20개 (무한스크롤 X) */
const HOME_CAROUSEL_PAGE = 6;
const HOME_CAROUSEL_MAX = 20;

/** 전체 탭 그리드: 가로6×세로5 = 30, 이후 30개씩 무한스크롤 */
const GRID_PAGE_SIZE = 30;

function defaultTab(_type: WorkType) {
  return "recommend";
}

function defaultStatus(type: WorkType): string {
  return type === "webtoon" ? "ongoing" : "all";
}

function parseListParam(value: string | null) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function scrollStorageKey(pathname: string, search: string) {
  return `allblu:explore-scroll:${pathname}${search}`;
}

function normalizeLegacyTab(type: WorkType, tab: string) {
  if (type !== "webtoon") return tab;
  if (tab === "ongoing" || tab === "done") return "all";
  return tab;
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

  const rawTab = searchParams.get("tab") || defaultTab(type);
  const tab = normalizeLegacyTab(type, rawTab);
  const statusFromUrl = searchParams.get("status");
  const statusFilter =
    statusFromUrl ||
    (type === "webtoon" && rawTab === "done"
      ? "done"
      : type === "webtoon" && rawTab === "ongoing"
        ? "ongoing"
        : defaultStatus(type));
  const genresParam = searchParams.get("genres") || "";
  const platformsParam = searchParams.get("platforms") || "";
  const daysParam = searchParams.get("days") || "";
  const genreFilters = useMemo(() => parseListParam(genresParam), [genresParam]);
  const platformFilters = useMemo(
    () => parseListParam(platformsParam),
    [platformsParam]
  );
  const dayFilters = useMemo(() => parseListParam(daysParam), [daysParam]);
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
  const genreOptions = useMemo(() => genresForType(type), [type, worksRevision]);
  const platformOptions = useMemo(() => platformsForType(type), [type, worksRevision]);
  const isGrid = tab === "all";

  const filtered = useMemo(() => {
    if (!isGrid) return all;
    return all.filter((work) => {
      const statusOk =
        type === "anime"
          ? matchesAnimeStatusFilter(work, statusFilter as AnimeStatusFilterId)
          : matchesWebtoonStatusFilter(work, statusFilter as WebtoonStatusFilterId);
      if (!statusOk) return false;
      if (!matchesGenreFilters(work, genreFilters)) return false;
      if (!matchesPlatformFilters(work, platformFilters)) return false;
      if (type === "webtoon" && !matchesWebtoonDayFilters(work, dayFilters)) {
        return false;
      }
      return true;
    });
  }, [
    all,
    dayFilters,
    genreFilters,
    isGrid,
    platformFilters,
    statusFilter,
    type,
  ]);

  const homeSections = useMemo(() => {
    return {
      rank: shuffleBySeed(all, `${type}-rank-${rankPeriod}`).slice(0, HOME_CAROUSEL_MAX),
      completed: all
        .filter((work) => isCompletedStatus(work.statusLabel))
        .slice(0, HOME_CAROUSEL_MAX),
      airing: all
        .filter((work) =>
          type === "anime"
            ? work.statusLabel === "방영 중" || work.statusLabel === "공개 예정"
            : work.statusLabel === "연재 중"
        )
        .slice(0, HOME_CAROUSEL_MAX),
      recent: [...all].slice(0, HOME_CAROUSEL_MAX),
    };
  }, [all, rankPeriod, type, worksRevision]);

  const selectedConditionCount = useMemo(() => {
    let countSelected = 0;
    if (statusFilter !== defaultStatus(type)) countSelected += 1;
    countSelected += genreFilters.length;
    countSelected += platformFilters.length;
    if (type === "webtoon") countSelected += dayFilters.length;
    return countSelected;
  }, [dayFilters.length, genreFilters.length, platformFilters.length, statusFilter, type]);

  const isFilterDirty = selectedConditionCount > 0;

  const buildQuery = useCallback(
    (next: {
      tab?: string;
      status?: string;
      genres?: string[];
      platforms?: string[];
      days?: string[];
      n?: number;
    }) => {
      const params = new URLSearchParams();
      const nextTab = next.tab ?? tab;
      const nextStatus = next.status ?? statusFilter;
      const nextGenres = next.genres ?? genreFilters;
      const nextPlatforms = next.platforms ?? platformFilters;
      const nextDays = next.days ?? dayFilters;
      const nextN = next.n ?? count;

      if (nextTab !== defaultTab(type)) params.set("tab", nextTab);

      if (nextTab === "all") {
        if (nextStatus !== defaultStatus(type)) params.set("status", nextStatus);
        if (nextGenres.length) params.set("genres", nextGenres.join(","));
        if (nextPlatforms.length) params.set("platforms", nextPlatforms.join(","));
        if (type === "webtoon" && nextDays.length) {
          params.set("days", nextDays.join(","));
        }
        if (nextN > GRID_PAGE_SIZE) params.set("n", String(nextN));
      }

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [
      tab,
      statusFilter,
      genreFilters,
      platformFilters,
      dayFilters,
      count,
      type,
      pathname,
    ]
  );

  const pushExploreUrl = useCallback(
    (next: {
      tab?: string;
      status?: string;
      genres?: string[];
      platforms?: string[];
      days?: string[];
      n?: number;
    }) => {
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
  }, [
    tab,
    statusFilter,
    genresParam,
    platformsParam,
    daysParam,
    type,
    countParam,
  ]);

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
  }, [pathname, tab, statusFilter, genreFilters, platformFilters, dayFilters, count]);

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
  }, [
    pathname,
    tab,
    statusFilter,
    genreFilters,
    platformFilters,
    dayFilters,
    count,
    filtered.length,
    isGrid,
  ]);

  const primaryTabs = [
    { id: "recommend", label: "올블루 추천" },
    { id: "all", label: "전체" },
  ];

  const resetFilters = () => {
    setCount(GRID_PAGE_SIZE);
    pushExploreUrl({
      tab: "all",
      status: defaultStatus(type),
      genres: [],
      platforms: [],
      days: [],
      n: GRID_PAGE_SIZE,
    });
  };

  const toggleMulti = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const onStatusClick = (id: string) => {
    setCount(GRID_PAGE_SIZE);
    const next = statusFilter === id ? "" : id;
    // 선택 해제 시 필터 없음(=전체와 동일하게 동작). URL에는 all로 정규화하지 않고 빈 상태를 all로 저장
    pushExploreUrl({
      status: next || "all",
      n: GRID_PAGE_SIZE,
    });
  };

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
                    status: defaultStatus(type),
                    genres: [],
                    platforms: [],
                    days: [],
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
          <section>
            <FilterPanel
              type={type}
              statusFilter={statusFilter}
              genreFilters={genreFilters}
              platformFilters={platformFilters}
              dayFilters={dayFilters}
              genreOptions={genreOptions}
              platformOptions={platformOptions}
              selectedConditionCount={selectedConditionCount}
              isFilterDirty={isFilterDirty}
              onStatusClick={onStatusClick}
              onGenreClick={(genre) => {
                setCount(GRID_PAGE_SIZE);
                pushExploreUrl({
                  genres: toggleMulti(genreFilters, genre),
                  n: GRID_PAGE_SIZE,
                });
              }}
              onPlatformClick={(platform) => {
                setCount(GRID_PAGE_SIZE);
                pushExploreUrl({
                  platforms: toggleMulti(platformFilters, platform),
                  n: GRID_PAGE_SIZE,
                });
              }}
              onDayClick={(day) => {
                setCount(GRID_PAGE_SIZE);
                pushExploreUrl({
                  days: toggleMulti(dayFilters, day),
                  n: GRID_PAGE_SIZE,
                });
              }}
              onReset={resetFilters}
            />

            <CatalogGrid
              works={filtered}
              count={count}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              loadingMore={loadingMore}
              sentinelRef={sentinelRef}
            />
          </section>
        ) : (
          <div className="space-y-5">
            <SectionCarousel
              title="인기작 순위 TOP 20"
              icon={sectionIcons.bigWave}
              works={homeSections.rank}
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
              title={type === "anime" ? "완결·종료 애니" : "완결 웹툰"}
              icon={sectionIcons.anchor}
              works={homeSections.completed}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              pageSize={HOME_CAROUSEL_PAGE}
            />
            <SectionCarousel
              title={type === "anime" ? "방영 중·공개 예정" : "연재 중 웹툰"}
              icon={sectionIcons.sunrise}
              works={homeSections.airing}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              pageSize={HOME_CAROUSEL_PAGE}
            />
            <SectionCarousel
              title="최근 추가된 작품"
              icon={sectionIcons.dropletNew}
              works={homeSections.recent}
              userId={state.currentUserId}
              statuses={userStatuses}
              ratingStats={ratingStats}
              pageSize={HOME_CAROUSEL_PAGE}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FilterPanel({
  type,
  statusFilter,
  genreFilters,
  platformFilters,
  dayFilters,
  genreOptions,
  platformOptions,
  selectedConditionCount,
  isFilterDirty,
  onStatusClick,
  onGenreClick,
  onPlatformClick,
  onDayClick,
  onReset,
}: {
  type: WorkType;
  statusFilter: string;
  genreFilters: string[];
  platformFilters: string[];
  dayFilters: string[];
  genreOptions: string[];
  platformOptions: string[];
  selectedConditionCount: number;
  isFilterDirty: boolean;
  onStatusClick: (id: string) => void;
  onGenreClick: (genre: string) => void;
  onPlatformClick: (platform: string) => void;
  onDayClick: (day: string) => void;
  onReset: () => void;
}) {
  const statusOptions =
    type === "anime" ? ANIME_STATUS_FILTERS : WEBTOON_STATUS_FILTERS;
  const statusLabel = type === "anime" ? "방영 상태" : "작품 상태";
  const hint =
    type === "anime"
      ? "방영 상태, 장르, 플랫폼을 복수로 골라 작품을 찾아보세요."
      : "작품 상태, 연재 요일, 장르, 플랫폼을 복수로 골라 작품을 찾아보세요.";

  return (
    <div className="mb-6 rounded-2xl border border-line bg-white p-4 md:p-5">
      <FilterRow label={statusLabel}>
        {statusOptions.map((item) => (
          <FilterChip
            key={item.id}
            label={item.label}
            active={statusFilter === item.id}
            onClick={() => onStatusClick(item.id)}
          />
        ))}
      </FilterRow>

      {type === "webtoon" ? (
        <FilterRow label="연재 요일">
          {WEBTOON_DAY_FILTERS.map((item) => (
            <FilterChip
              key={item.id}
              label={item.label}
              active={dayFilters.includes(item.id)}
              onClick={() => onDayClick(item.id)}
            />
          ))}
        </FilterRow>
      ) : null}

      <FilterRow label="장르">
        {genreOptions.map((genre) => (
          <FilterChip
            key={genre}
            label={genre}
            active={genreFilters.includes(genre)}
            onClick={() => onGenreClick(genre)}
          />
        ))}
      </FilterRow>

      <FilterRow label="플랫폼" last>
        {platformOptions.map((platform) => (
          <FilterChip
            key={platform}
            label={platform}
            active={platformFilters.includes(platform)}
            onClick={() => onPlatformClick(platform)}
          />
        ))}
      </FilterRow>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs font-bold text-muted">
          {isFilterDirty
            ? `선택한 조건 ${selectedConditionCount}개가 적용되어 있어요.`
            : hint}
        </p>
        <button
          type="button"
          onClick={onReset}
          className={`rounded-lg px-4 py-2 text-sm font-black transition ${
            isFilterDirty
              ? "bg-brand text-white"
              : "border border-line bg-[#f3f4f6] text-muted"
          }`}
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4 ${
        last ? "" : "mb-3"
      }`}
    >
      <p className="w-20 shrink-0 pt-1.5 text-sm font-black text-ink">{label}</p>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
        active
          ? "bg-brand text-white"
          : "border border-line bg-[#f3f4f6] text-ink hover:border-brand/40"
      }`}
    >
      {label}
    </button>
  );
}

function CatalogGrid({
  works,
  count,
  userId,
  statuses,
  ratingStats,
  loadingMore,
  sentinelRef,
}: {
  works: Work[];
  count: number;
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
  ratingStats?: Map<string, import("@/lib/ratings").WorkRatingStats>;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
}) {
  const visible = works.slice(0, count);

  return (
    <section>
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
