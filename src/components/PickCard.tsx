"use client";

import Link from "next/link";
import WorkThumbnail from "./WorkThumbnail";
import {
  buildRecommendedWorkHref,
  trackOllpickRecommendClick,
  type RecommendClickSurface,
} from "@/lib/analytics";
import { getWork } from "@/lib/works";
import type { Ollpick, WorkStatus } from "@/lib/types";

/** 홈/상단 올블픽 픽카드 — 추천작 썸네일 + 우측 제목·동의이유, 하단 더보기 */
export default function PickCard({
  pick,
  userId,
  statuses = {},
  surface = "home_recent",
}: {
  pick: Ollpick;
  userId?: string;
  statuses?: Record<string, WorkStatus>;
  surface?: RecommendClickSurface;
}) {
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  const latestReason =
    [...pick.reasons].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    )[0]?.content ?? "";
  const agreeCount = pick.agreeUserIds.length;
  const detailHref = `/ollpick/${pick.baseWorkId}`;
  const recommendedHref = buildRecommendedWorkHref(recommended.id, {
    recommendId: pick.id,
    agreeCount,
  });

  const trackClick = (
    clickTarget: "base_work" | "recommended_work" | "card",
    setAttribution = false
  ) => {
    trackOllpickRecommendClick({
      recommendId: pick.id,
      baseWorkId: pick.baseWorkId,
      recommendedWorkId: pick.recommendedWorkId,
      surface,
      clickTarget,
      agreeCount,
      setAttribution,
    });
  };

  return (
    <article className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-black text-white">
            {pick.firstRecommender.slice(0, 1)}
          </span>
          <p className="min-w-0 text-[13px] font-bold leading-snug text-ink line-clamp-2">
            <span className="text-brand">{pick.firstRecommender}</span>
            님이 「
            <Link
              href={`/works/${base.id}`}
              className="hover:text-brand"
              onClick={() => trackClick("base_work")}
            >
              {base.title}
            </Link>
            」 보고 추천해요
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-bold text-muted">
          <span className="text-brand">✓</span>
          동의 {agreeCount}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 gap-3">
        <div className="w-[88px] shrink-0 sm:w-[96px]">
          <WorkThumbnail
            work={recommended}
            userId={userId}
            status={statuses[recommended.id]}
            showMeta={false}
            href={recommendedHref}
            onWorkOpen={() => trackClick("recommended_work", true)}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={recommendedHref}
            className="line-clamp-2 text-[15px] font-black leading-snug text-ink hover:text-brand"
            onClick={() => trackClick("recommended_work", true)}
          >
            {recommended.title}
          </Link>
          {latestReason ? (
            <div className="mt-2 rounded-xl bg-surface px-3 py-2.5 text-sm leading-relaxed text-muted">
              <p className="line-clamp-4">“{latestReason}”</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">아직 작성된 추천 이유가 없습니다.</p>
          )}
        </div>
      </div>

      <Link
        href={detailHref}
        onClick={() => trackClick("card")}
        className="mt-4 block rounded-xl bg-[#eef0ff] py-2.5 text-center text-sm font-bold text-brand transition hover:bg-[#e4e7ff]"
      >
        이 작품의 올블픽 더보기
      </Link>
    </article>
  );
}
