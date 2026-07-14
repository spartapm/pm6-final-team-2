"use client";

import Link from "next/link";
import { useState } from "react";
import WorkThumbnail from "./WorkThumbnail";
import { showLoginRequired, showToast } from "./Toast";
import { agreePick } from "@/lib/store";
import {
  trackAppError,
  trackOllpickRecommendClick,
  trackReasonMoreClick,
  trackRecommendAgreeStart,
  trackRecommendAgreeSubmit,
  type AgreeSurface,
  type RecommendClickSurface,
} from "@/lib/analytics";
import { getWork } from "@/lib/works";
import { relativeTime } from "@/lib/time";
import type { Ollpick, WorkStatus } from "@/lib/types";

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
  const [openReasons, setOpenReasons] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  const latest = pick.reasons[0];
  const alreadyAgreed = userId ? pick.agreeUserIds.includes(userId) : false;
  const agreeSurface: AgreeSurface = surface;
  const isEligible = (workId: string) =>
    ["WATCHING", "DONE"].includes(statuses[workId] ?? "");
  /** 기준작·추천작(대상작) 모두 보는중/완료여야 동의 가능 */
  const canAgree = isEligible(pick.baseWorkId) && isEligible(pick.recommendedWorkId);

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
      agreeCount: pick.agreeUserIds.length,
      setAttribution,
    });
  };

  const submitAgree = async () => {
    if (!userId) {
      showLoginRequired("agree");
      return;
    }
    if (!canAgree) {
      showToast("본 작품(보는중/완료) 등록 후 동의할 수 있습니다");
      return;
    }
    if (alreadyAgreed) return;
    if (reason.trim().length < 10 || reason.length > 200) {
      alert("인정 이유는 10자 이상 200자 이하로 작성해주세요.");
      return;
    }
    const reasonLength = reason.trim().length;
    const result = await agreePick(pick.id, reason.trim(), userId);
    if (!result.ok) {
      showToast(result.message);
      trackAppError({
        errorType: "agree_submit_fail",
        pageName: surface === "userrec_detail" ? "userrec_detail" : "ollpick",
      });
      return;
    }
    trackRecommendAgreeSubmit({
      recommendId: pick.id,
      reasonLength,
      surface: agreeSurface,
    });
    setReason("");
    setAgreeOpen(false);
    setOpenReasons(true);
  };

  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
            {pick.firstRecommender.slice(0, 1)}
          </span>
          <span className="text-sm font-bold">{pick.firstRecommender}</span>
          <span className="rounded-full bg-blueSoft px-2 py-0.5 text-[11px] font-bold text-brand">
            추천
          </span>
        </div>
        <span className="text-xs font-bold text-muted">{relativeTime(pick.createdAt)}</span>
      </div>

      <h3 className="mb-4 text-[17px] font-black leading-snug tracking-tight">
        <Link
          href={`/works/${base.id}`}
          className="hover:text-brand"
          onClick={() => trackClick("base_work")}
        >
          {base.title}
        </Link>{" "}
        봤다면 →{" "}
        <Link
          href={`/works/${recommended.id}`}
          className="text-brand hover:underline"
          onClick={() => trackClick("recommended_work", true)}
        >
          {recommended.title}
        </Link>{" "}
        어때요?
      </h3>

      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div>
          <WorkThumbnail
            work={base}
            userId={userId}
            status={statuses[base.id]}
            compact
            showMeta={false}
            onWorkOpen={() => trackClick("base_work")}
          />
          <p className="mt-1 text-center text-[11px] font-bold text-muted">
            {base.type === "anime" ? "애니" : "웹툰"}
          </p>
        </div>
        <div className="pt-16 text-xl font-black text-brand">→</div>
        <div>
          <WorkThumbnail
            work={recommended}
            userId={userId}
            status={statuses[recommended.id]}
            compact
            showMeta={false}
            onWorkOpen={() => trackClick("recommended_work", true)}
          />
          <p className="mt-1 text-center text-[11px] font-bold text-muted">
            {recommended.type === "anime" ? "애니" : "웹툰"}
          </p>
        </div>
      </div>

      {latest ? (
        <div className="mb-4 rounded-xl bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
              {latest.nickname.slice(0, 1)}
            </span>
            <span className="text-xs font-bold">{latest.nickname}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink/85">{latest.content}</p>
        </div>
      ) : null}

      {openReasons && pick.reasons.length > 1 ? (
        <div className="mb-4 space-y-2">
          {pick.reasons.slice(1).map((item) => (
            <div key={item.id} className="rounded-xl border border-line px-3 py-2">
              <p className="mb-1 text-xs font-bold">{item.nickname}</p>
              <p className="text-sm text-ink/85">{item.content}</p>
            </div>
          ))}
        </div>
      ) : null}

      {agreeOpen ? (
        <div className="mb-4 rounded-xl border border-line p-3">
          <p className="mb-2 text-xs font-bold text-muted">인정 이유를 남겨주세요 (10~200자)</p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-[80px] w-full resize-none rounded-lg border border-line p-2 text-sm outline-none"
            placeholder="왜 이 추천에 동의하는지 적어주세요"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAgreeOpen(false)}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void submitAgree()}
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
            >
              동의 등록
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setOpenReasons((value) => {
              const next = !value;
              if (next) {
                trackReasonMoreClick({ recommendId: pick.id, surface });
              }
              return next;
            });
          }}
          className="text-xs font-bold text-muted hover:text-brand"
        >
          {openReasons ? "▲ 이유 접기" : "▼ 이유 더보기"}
        </button>
        <button
          type="button"
          disabled={alreadyAgreed}
          onClick={() => {
            if (!userId) {
              showLoginRequired("agree");
              return;
            }
            if (!canAgree) {
              showToast("본 작품(보는중/완료) 등록 후 동의할 수 있습니다");
              return;
            }
            setAgreeOpen(true);
            trackRecommendAgreeStart({
              recommendId: pick.id,
              surface: agreeSurface,
            });
          }}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white disabled:pointer-events-none disabled:opacity-40"
        >
          🔥 동의 +{pick.agreeUserIds.length}
        </button>
      </div>
    </article>
  );
}
