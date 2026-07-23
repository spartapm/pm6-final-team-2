"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WorkThumbnail from "@/components/WorkThumbnail";
import Spinner from "@/components/Spinner";
import { buildRatingStatsMap } from "@/lib/ratings";
import { useAllbluState } from "@/lib/useAllbluState";
import {
  canonicalPlatformName,
  workPlatformNames,
  works,
} from "@/lib/works";
import type { Work, WorkStatus, WorkType } from "@/lib/types";

/** 최초 가로6 × 세로5 = 30, 이후 30개씩 세로 무한스크롤 */
const PAGE_SIZE = 30;

export type LibraryStatusFilter = "ALL" | WorkStatus;

export const LIBRARY_STATUS_FILTERS: {
  id: LibraryStatusFilter;
  label: string;
}[] = [
  { id: "ALL", label: "전체" },
  { id: "KEEP", label: "볼 예정" },
  { id: "WATCHING", label: "보는 중" },
  { id: "DONE", label: "완료" },
  { id: "STOPPED", label: "중단" },
];

export default function LibraryShelf({
  type,
  userId,
  statuses,
  statusTimes,
  initialStatus = "ALL",
}: {
  type: WorkType;
  userId: string;
  statuses: Record<string, WorkStatus>;
  statusTimes: Record<string, string>;
  initialStatus?: LibraryStatusFilter;
}) {
  const { state, worksRevision } = useAllbluState();
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>(initialStatus);
  const [detailOpen, setDetailOpen] = useState(false);
  const [genreFilters, setGenreFilters] = useState<string[]>([]);
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [count, setCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const ratingStats = useMemo(
    () => buildRatingStatsMap(state.reviews),
    [state.reviews]
  );

  const library = useMemo(
    () =>
      works
        .filter((work) => work.type === type && statuses[work.id])
        .sort((a, b) => {
          const ta = statusTimes[a.id] ?? "";
          const tb = statusTimes[b.id] ?? "";
          return tb.localeCompare(ta);
        }),
    [type, statuses, statusTimes, worksRevision]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<LibraryStatusFilter, number> = {
      ALL: library.length,
      KEEP: 0,
      WATCHING: 0,
      DONE: 0,
      STOPPED: 0,
    };
    for (const work of library) {
      const status = statuses[work.id];
      if (status) counts[status] += 1;
    }
    return counts;
  }, [library, statuses]);

  const genreOptions = useMemo(() => uniqueGenres(library), [library]);
  const platformOptions = useMemo(() => uniquePlatforms(library), [library]);

  const filtered = useMemo(() => {
    return library.filter((work) => {
      if (statusFilter !== "ALL" && statuses[work.id] !== statusFilter) return false;
      if (genreFilters.length && !genreFilters.some((g) => work.genres.includes(g))) {
        return false;
      }
      if (platformFilters.length) {
        const names = workPlatformNames(work);
        if (!platformFilters.some((p) => names.includes(p))) return false;
      }
      return true;
    });
  }, [library, statusFilter, statuses, genreFilters, platformFilters]);

  const hasDetailFilters = genreFilters.length > 0 || platformFilters.length > 0;

  useEffect(() => {
    setStatusFilter(initialStatus);
    setGenreFilters([]);
    setPlatformFilters([]);
    setDetailOpen(false);
    setCount(PAGE_SIZE);
  }, [type, initialStatus]);

  useEffect(() => {
    setCount(PAGE_SIZE);
  }, [statusFilter, genreFilters, platformFilters]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (!hit || loadingMore || count >= filtered.length) return;
        setLoadingMore(true);
        window.setTimeout(() => {
          setCount((value) => Math.min(value + PAGE_SIZE, filtered.length));
          setLoadingMore(false);
        }, 350);
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [count, filtered.length, loadingMore]);

  const visible = filtered.slice(0, count);
  const title = type === "anime" ? "내 애니" : "내 웹툰";

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const resetDetailFilters = () => {
    setGenreFilters([]);
    setPlatformFilters([]);
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          저장한 작품을 감상 상태와 상세 조건으로 골라보세요.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {LIBRARY_STATUS_FILTERS.map((item) => {
            const active = statusFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                  active
                    ? "bg-brand text-white"
                    : "border border-line bg-[#f3f4f6] text-ink hover:border-brand/40"
                }`}
              >
                {item.label} {statusCounts[item.id]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-md border border-line bg-[#f8fafc] px-2.5 py-1 text-xs font-black text-ink">
            {filtered.length}개
          </span>
          <button
            type="button"
            onClick={() => setDetailOpen((open) => !open)}
            className="rounded-lg border border-brand/30 bg-white px-3 py-1.5 text-xs font-bold text-brand hover:bg-blueSoft"
          >
            {detailOpen ? "상세 필터 접기" : "상세 필터 열기"}
          </button>
        </div>
      </div>

      {detailOpen ? (
        <div className="mb-4 rounded-xl border border-line bg-[#f8fafc] p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <p className="w-16 shrink-0 pt-1.5 text-sm font-black">장르</p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {genreOptions.length ? (
                genreOptions.map((genre) => {
                  const active = genreFilters.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setGenreFilters(toggle(genreFilters, genre))}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                        active
                          ? "bg-brand text-white"
                          : "border border-line bg-white text-ink hover:border-brand/40"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted">선택 가능한 장르가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <p className="w-16 shrink-0 pt-1.5 text-sm font-black">플랫폼</p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {platformOptions.length ? (
                platformOptions.map((platform) => {
                  const active = platformFilters.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() =>
                        setPlatformFilters(toggle(platformFilters, platform))
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                        active
                          ? "bg-brand text-white"
                          : "border border-line bg-white text-ink hover:border-brand/40"
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted">선택 가능한 플랫폼이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-xs font-bold text-muted">
              장르·플랫폼은 복수 선택 할 수 있어요
            </p>
            <button
              type="button"
              onClick={resetDetailFilters}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                hasDetailFilters
                  ? "bg-brand text-white"
                  : "border border-line bg-white text-muted"
              }`}
            >
              상세 필터 초기화
            </button>
          </div>
        </div>
      ) : null}

      {!library.length ? (
        <p className="py-16 text-center text-sm font-bold text-muted">
          아직 추가하신게 없어요
        </p>
      ) : !filtered.length ? (
        <p className="py-16 text-center text-sm font-bold text-muted">
          조건에 맞는 작품이 없습니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {visible.map((work) => (
              <WorkThumbnail
                key={work.id}
                work={work}
                userId={userId}
                status={statuses[work.id]}
                averageRating={ratingStats.get(work.id)?.average ?? 0}
                metaMode="library"
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-8" />
          {loadingMore ? (
            <div className="flex justify-center py-4">
              <Spinner compact />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function uniqueGenres(list: Work[]) {
  const counts = new Map<string, number>();
  for (const work of list) {
    for (const genre of work.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([name]) => name);
}

function uniquePlatforms(list: Work[]) {
  const counts = new Map<string, number>();
  for (const work of list) {
    for (const name of workPlatformNames(work)) {
      const canonical = canonicalPlatformName(name);
      if (!canonical) continue;
      counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([name]) => name);
}
