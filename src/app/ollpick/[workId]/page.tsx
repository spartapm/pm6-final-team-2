"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import AppShell from "@/components/AppShell";
import UserNicknameLink from "@/components/UserNicknameLink";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showLoginRequired, showToast } from "@/components/Toast";
import { agreePick } from "@/lib/store";
import {
  buildRecommendedWorkHref,
  trackAppError,
  trackOllpickRecommendClick,
  trackRecommendAgreeStart,
  trackRecommendAgreeSubmit,
} from "@/lib/analytics";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";
import type { Ollpick, Work, WorkStatus } from "@/lib/types";

export default function UserRecDetailPage() {
  const params = useParams<{ workId: string }>();
  const router = useRouter();
  const { state, worksRevision } = useAllbluState();
  const baseWork = useMemo(() => getWork(params.workId), [params.workId, worksRevision]);

  const user = state.users.find((item) => item.id === state.currentUserId);
  const statuses = user ? state.workStatuses[user.id] ?? {} : {};

  const watchedWorks = useMemo(() => {
    if (!user) return [];
    return works.filter((work) => ["WATCHING", "DONE"].includes(statuses[work.id] ?? ""));
  }, [statuses, user, worksRevision]);

  /** 한 번에 하나의 동의 입력창만 열림 */
  const [agreePickId, setAgreePickId] = useState<string | null>(null);

  const isEligibleStatus = (workId: string) =>
    ["WATCHING", "DONE"].includes(statuses[workId] ?? "");

  const relatedPicks = useMemo(() => {
    if (!baseWork) return [] as Ollpick[];
    return state.picks
      .filter((pick) => pick.baseWorkId === baseWork.id)
      .sort((a, b) => b.agreeUserIds.length - a.agreeUserIds.length);
  }, [baseWork, state.picks, worksRevision]);

  const recommendationRows = useMemo(() => {
    if (!baseWork) return [] as { work: Work; pick: Ollpick }[];

    return relatedPicks
      .map((pick) => {
        const work = getWork(pick.recommendedWorkId);
        return work ? { work, pick } : null;
      })
      .filter((item): item is { work: Work; pick: Ollpick } => item != null);
  }, [baseWork, relatedPicks]);

  if (!baseWork) notFound();

  /** 클릭 시 작성 페이지로 전환 (모달 X) — 동의하기와 경로 완전 분리 */
  const openWrite = () => {
    if (!user) {
      showLoginRequired("recommend_write");
      return;
    }
    if (!watchedWorks.length) {
      showToast("본 작품(보는중/완료)을 먼저 등록해주세요");
      return;
    }
    if (!watchedWorks.some((work) => work.id === baseWork.id)) {
      showToast("기준 작품을 보는중/완료로 등록해야 추천할 수 있습니다");
      return;
    }
    const paramsQs = new URLSearchParams({ base: baseWork.id });
    router.push(`/ollpick/write?${paramsQs.toString()}`);
  };

  return (
    <AppShell>
      <div className="px-5 py-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Left: 기준작 정보만 (작성 CTA는 우측으로 분리 — sticky 오클릭 방지) */}
          <aside className="lg:sticky lg:top-24 lg:z-0 lg:self-start">
            <div className="mx-auto w-full max-w-[200px]">
              <WorkThumbnail
                work={baseWork}
                userId={user?.id}
                status={user ? statuses[baseWork.id] : undefined}
                showMeta={false}
              />
            </div>
            <h1 className="mt-4 text-center text-xl font-black tracking-tight">
              {baseWork.title}
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted">
              와 비슷한 작품을 찾고 있다면,
              <br />
              이런 작품들은 어떠세요.
            </p>
            <Link
              href="/ollpick"
              className="mt-5 block text-center text-xs font-bold text-muted hover:text-brand"
            >
              올블픽 홈으로
            </Link>
          </aside>

          {/* Right: 추천 목록 + 작성 CTA */}
          <section className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-muted">이 작품으로 이어지는 추천</p>
              <button
                type="button"
                onClick={openWrite}
                className="btn-primary h-10 shrink-0 px-4 text-sm"
              >
                + 내 추천 작성하기
              </button>
            </div>

            {recommendationRows.length ? (
              recommendationRows.map(({ work, pick }) => (
                <RecommendationBlock
                  key={pick.id}
                  baseTitle={baseWork.title}
                  work={work}
                  pick={pick}
                  userId={user?.id}
                  status={user ? statuses[work.id] : undefined}
                  canAgree={
                    isEligibleStatus(pick.baseWorkId) &&
                    isEligibleStatus(pick.recommendedWorkId)
                  }
                  agreeOpen={agreePickId === pick.id}
                  onOpenAgree={() => setAgreePickId(pick.id)}
                  onCloseAgree={() =>
                    setAgreePickId((current) => (current === pick.id ? null : current))
                  }
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
                <p className="font-black">아직 추천한 작품이 없어요</p>
                <button
                  type="button"
                  onClick={openWrite}
                  className="btn-primary mt-4 h-11 px-6 text-sm"
                >
                  + 첫 추천 작성하기
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function RecommendationBlock({
  baseTitle,
  work,
  pick,
  userId,
  status,
  canAgree,
  agreeOpen,
  onOpenAgree,
  onCloseAgree,
}: {
  baseTitle: string;
  work: Work;
  pick: Ollpick;
  userId?: string;
  status?: WorkStatus;
  canAgree: boolean;
  agreeOpen: boolean;
  onOpenAgree: () => void;
  onCloseAgree: () => void;
}) {
  const [openReasons, setOpenReasons] = useState(false);
  const [reason, setReason] = useState("");

  const reasons = useMemo(
    () =>
      [...pick.reasons].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      ),
    [pick.reasons]
  );
  const visibleReasons = openReasons ? reasons : reasons.slice(0, 2);
  const alreadyAgreed = userId ? pick.agreeUserIds.includes(userId) : false;
  const particle = endsWithBatchim(work.title) ? "을" : "를";

  const trackClick = (
    clickTarget: "base_work" | "recommended_work" | "card",
    setAttribution = false
  ) => {
    trackOllpickRecommendClick({
      recommendId: pick.id,
      baseWorkId: pick.baseWorkId,
      recommendedWorkId: pick.recommendedWorkId,
      surface: "userrec_detail",
      clickTarget,
      agreeCount: pick.agreeUserIds.length,
      setAttribution,
    });
  };

  const beginAgree = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId) {
      showLoginRequired("agree");
      return;
    }
    if (!canAgree) {
      showToast("본 작품(보는중/완료) 등록 후 동의할 수 있습니다");
      return;
    }
    if (alreadyAgreed) {
      showToast("이미 동의한 추천입니다");
      return;
    }
    onOpenAgree();
    trackRecommendAgreeStart({
      recommendId: pick.id,
      surface: "userrec_detail",
    });
  };

  const submitAgree = async () => {
    if (!userId || alreadyAgreed) return;
    if (reason.trim().length < 10 || reason.length > 200) {
      alert("추천 이유는 10자 이상 200자 이하로 작성해주세요.");
      return;
    }
    const reasonLength = reason.trim().length;
    const result = await agreePick(pick.id, reason.trim(), userId);
    if (!result.ok) {
      showToast(result.message);
      trackAppError({
        errorType: "agree_submit_fail",
        pageName: "ollpick",
      });
      return;
    }
    trackRecommendAgreeSubmit({
      recommendId: pick.id,
      reasonLength,
      surface: "userrec_detail",
    });
    setReason("");
    onCloseAgree();
    setOpenReasons(true);
  };

  const recommendedHref = buildRecommendedWorkHref(work.id, {
    recommendId: pick.id,
    agreeCount: pick.agreeUserIds.length,
  });

  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="flex gap-4">
        <div className="w-[88px] shrink-0">
          <WorkThumbnail
            work={work}
            userId={userId}
            status={status}
            showMeta={false}
            href={recommendedHref}
            onWorkOpen={() => trackClick("recommended_work", true)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={recommendedHref}
            className="text-lg font-black tracking-tight hover:text-brand"
            onClick={() => trackClick("recommended_work", true)}
          >
            {work.title}
          </Link>
          <p className="mt-1 text-xs font-bold text-muted">
            {work.type === "anime" ? "애니" : "웹툰"} · {work.statusLabel} ·{" "}
            {work.genres.join(" · ")}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sm font-bold text-ink">
              🔥 {pick.agreeUserIds.length}명 추천
            </span>
            <button
              type="button"
              disabled={alreadyAgreed}
              onClick={beginAgree}
              className="relative z-10 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white disabled:pointer-events-none disabled:opacity-40"
            >
              {alreadyAgreed ? "동의함" : "+ 동의하기"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-3 text-sm font-black">
          {work.title}
          {particle} 추천하는 이유
        </h3>

        <div className="space-y-3">
          {visibleReasons.map((item) => (
            <div key={item.id} className="flex gap-2">
              <UserNicknameLink
                userId={item.userId}
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white"
              >
                {item.nickname.slice(0, 1)}
              </UserNicknameLink>
              <div className="min-w-0">
                <UserNicknameLink
                  userId={item.userId}
                  className="text-xs font-bold hover:text-brand"
                >
                  {item.nickname}
                </UserNicknameLink>
                <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{item.content}</p>
              </div>
            </div>
          ))}
        </div>

        {reasons.length > 2 ? (
          <button
            type="button"
            onClick={() => setOpenReasons((value) => !value)}
            className="mt-3 text-xs font-bold text-muted hover:text-brand"
          >
            {openReasons ? "이유 접기 △" : "이유 더보기 ▽"}
          </button>
        ) : null}

        {agreeOpen ? (
          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <p className="mb-1 text-sm font-black">추천 이유 작성</p>
            <p className="mb-3 text-[11px] text-muted">
              {baseTitle} → {work.title} · 댓글이 아니라 추천 인정 이유입니다. (10~200자)
            </p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 200))}
              className="min-h-[96px] w-full resize-none rounded-lg border border-line bg-white p-3 text-sm outline-none focus:border-brand"
              placeholder="왜 이 작품을 추천하는지 적어주세요"
              autoFocus
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-muted">{reason.length}/200</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onCloseAgree();
                    setReason("");
                  }}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold"
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
          </div>
        ) : null}
      </div>
    </article>
  );
}

function endsWithBatchim(text: string) {
  const last = text.charCodeAt(text.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}
