"use client";

import Link from "next/link";
import WorkThumbnail from "./WorkThumbnail";
import { getWork } from "@/lib/works";
import type { Ollpick, WorkStatus } from "@/lib/types";

export default function PickCard({
  pick,
  userId,
  statuses = {},
}: {
  pick: Ollpick;
  userId?: string;
  statuses?: Record<string, WorkStatus>;
}) {
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  return (
    <article className="min-w-0 rounded-2xl border border-line bg-white p-4 transition hover:shadow-card">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <WorkThumbnail
            work={base}
            userId={userId}
            status={statuses[base.id]}
            compact
          />
          <p className="mt-1 text-center text-[11px] font-bold text-muted">좋아하신다면</p>
        </div>
        <div>
          <WorkThumbnail
            work={recommended}
            userId={userId}
            status={statuses[recommended.id]}
            compact
          />
          <p className="mt-1 text-center text-[11px] font-bold text-muted">추천해요</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Link
          href={`/ollpick/${pick.baseWorkId}`}
          className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-muted hover:text-brand"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] text-white">
            {pick.firstRecommender.slice(0, 1)}
          </span>
          <span className="line-clamp-1">{pick.firstRecommender} 님이 추가함</span>
        </Link>
        <span className="shrink-0 text-xs font-bold text-brand">
          💙 {pick.agreeUserIds.length || 1}
        </span>
      </div>
    </article>
  );
}
