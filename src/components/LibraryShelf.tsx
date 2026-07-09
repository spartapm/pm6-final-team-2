"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WorkThumbnail from "@/components/WorkThumbnail";
import Spinner from "@/components/Spinner";
import { works } from "@/lib/works";
import type { WorkStatus, WorkType } from "@/lib/types";

/** 최초 가로6 × 세로5 = 30, 이후 30개씩 세로 무한스크롤 */
const PAGE_SIZE = 30;

export default function LibraryShelf({
  type,
  userId,
  statuses,
  statusTimes,
}: {
  type: WorkType;
  userId: string;
  statuses: Record<string, WorkStatus>;
  statusTimes: Record<string, string>;
}) {
  const [count, setCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const library = useMemo(
    () =>
      works
        .filter((work) => work.type === type && statuses[work.id])
        .sort((a, b) => {
          const ta = statusTimes[a.id] ?? "";
          const tb = statusTimes[b.id] ?? "";
          return tb.localeCompare(ta);
        }),
    [type, statuses, statusTimes]
  );

  useEffect(() => {
    setCount(PAGE_SIZE);
  }, [type]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (!hit || loadingMore || count >= library.length) return;
        setLoadingMore(true);
        window.setTimeout(() => {
          setCount((value) => Math.min(value + PAGE_SIZE, library.length));
          setLoadingMore(false);
        }, 350);
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [count, library.length, loadingMore]);

  const visible = library.slice(0, count);

  if (!library.length) {
    return (
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <p className="py-16 text-center text-sm font-bold text-muted">
          아직 추가하신게 없어요
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {visible.map((work) => (
          <WorkThumbnail
            key={work.id}
            work={work}
            userId={userId}
            status={statuses[work.id]}
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
    </section>
  );
}
