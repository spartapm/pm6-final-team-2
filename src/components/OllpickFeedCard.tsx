"use client";

import Link from "next/link";
import { useState } from "react";
import WorkThumbnail from "./WorkThumbnail";
import { showToast } from "./Toast";
import { agreePick } from "@/lib/store";
import { getWork } from "@/lib/works";
import { relativeTime } from "@/lib/time";
import type { Ollpick, WorkStatus } from "@/lib/types";

export default function OllpickFeedCard({
  pick,
  userId,
  statuses = {},
  canAgree,
}: {
  pick: Ollpick;
  userId?: string;
  statuses?: Record<string, WorkStatus>;
  canAgree: boolean;
}) {
  const [openReasons, setOpenReasons] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  const latest = pick.reasons[0];
  const alreadyAgreed = userId ? pick.agreeUserIds.includes(userId) : false;

  const submitAgree = async () => {
    if (!userId) {
      showToast("로그인이 필요한 기능입니다");
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
    const result = await agreePick(pick.id, reason.trim(), userId);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
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
        <Link href={`/ollpick/${base.id}`} className="hover:text-brand">
          {base.title}
        </Link>{" "}
        봤다면 →{" "}
        <Link href={`/ollpick/${recommended.id}`} className="text-brand hover:underline">
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
          onClick={() => setOpenReasons((value) => !value)}
          className="text-xs font-bold text-muted hover:text-brand"
        >
          {openReasons ? "▲ 이유 접기" : "▼ 이유 더보기"}
        </button>
        <button
          type="button"
          disabled={!canAgree || alreadyAgreed}
          onClick={() => {
            if (!userId) {
              showToast("로그인이 필요한 기능입니다");
              return;
            }
            if (!canAgree) {
              showToast("본 작품(보는중/완료) 등록 후 동의할 수 있습니다");
              return;
            }
            setAgreeOpen(true);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          🔥 동의 +{pick.agreeUserIds.length}
        </button>
      </div>
    </article>
  );
}
