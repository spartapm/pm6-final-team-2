"use client";

import Link from "next/link";
import WorkThumbnail from "./WorkThumbnail";
import {
  buildRecommendedWorkHref,
  trackOllpickRecommendClick,
  type RecommendClickSurface,
} from "@/lib/analytics";
import { getWork } from "@/lib/works";
import { relativeTime } from "@/lib/time";
import type { Ollpick, WorkStatus } from "@/lib/types";

function particleEulReul(title: string) {
  const last = title.charCodeAt(title.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 !== 0 ? "을" : "를";
}

/** 올블픽 탭 피드 카드 — 홈「방금 올라온 올블픽」과 동일한 동의/더보기 스타일 */
export default function OllpickFeedCard({
  pick,
  userId,
  statuses = {},
  surface = "ollpick_list",
}: {
  pick: Ollpick;
  userId?: string;
  statuses?: Record<string, WorkStatus>;
  surface?: Extract<RecommendClickSurface, "ollpick_list" | "userrec_detail">;
}) {
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  const latest = [...pick.reasons].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  )[0];
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
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-black text-white">
            {pick.firstRecommender.slice(0, 1)}
          </span>
          <span className="truncate text-sm font-bold">{pick.firstRecommender}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="text-brand">✓</span>
            동의 {agreeCount}
          </span>
          <span>{relativeTime(pick.createdAt)}</span>
        </div>
      </div>

      <h3 className="mb-3 text-[15px] font-black leading-snug tracking-tight sm:text-[16px]">
        <Link
          href={`/works/${base.id}`}
          className="hover:text-brand"
          onClick={() => trackClick("base_work")}
        >
          {base.title}
        </Link>{" "}
        봤다면 →{" "}
        <Link
          href={recommendedHref}
          className="text-brand hover:underline"
          onClick={() => trackClick("recommended_work", true)}
        >
          {recommended.title}
        </Link>{" "}
        어때요?
      </h3>

      <div className="mb-4 flex items-start justify-center gap-2 sm:gap-3">
        <div className="w-[88px] shrink-0 sm:w-[100px]">
          <WorkThumbnail
            work={base}
            userId={userId}
            status={statuses[base.id]}
            compact
            showMeta={false}
            onWorkOpen={() => trackClick("base_work")}
          />
          <p className="mt-1.5 line-clamp-2 text-center text-[12px] font-black leading-snug">
            {base.title}
          </p>
          <p className="mt-0.5 text-center text-[10px] font-bold text-muted">
            {base.type === "anime" ? "애니" : "웹툰"}
          </p>
        </div>
        <div className="pt-10 text-base font-black text-brand sm:pt-12">→</div>
        <div className="w-[88px] shrink-0 sm:w-[100px]">
          <WorkThumbnail
            work={recommended}
            userId={userId}
            status={statuses[recommended.id]}
            compact
            showMeta={false}
            href={recommendedHref}
            onWorkOpen={() => trackClick("recommended_work", true)}
          />
          <p className="mt-1.5 line-clamp-2 text-center text-[12px] font-black leading-snug">
            {recommended.title}
          </p>
          <p className="mt-0.5 text-center text-[10px] font-bold text-muted">
            {recommended.type === "anime" ? "애니" : "웹툰"}
          </p>
        </div>
      </div>

      <h4 className="mb-2 text-sm font-black">
        {recommended.title}
        {particleEulReul(recommended.title)} 추천하는 이유
      </h4>

      {latest ? (
        <div className="mb-3 rounded-xl bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
              {latest.nickname.slice(0, 1)}
            </span>
            <span className="text-xs font-bold">{latest.nickname}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink/85">{latest.content}</p>
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted">아직 작성된 추천 이유가 없습니다.</p>
      )}

      <Link
        href={detailHref}
        onClick={() => trackClick("card")}
        className="block rounded-xl bg-[#eef0ff] py-2.5 text-center text-sm font-bold text-brand transition hover:bg-[#e4e7ff]"
      >
        이 작품의 올블픽 더보기
      </Link>
    </article>
  );
}
