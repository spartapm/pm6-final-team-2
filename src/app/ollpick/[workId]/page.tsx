"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showToast } from "@/components/Toast";
import { agreePick } from "@/lib/store";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works, worksByType } from "@/lib/works";
import type { Ollpick, Work } from "@/lib/types";

export default function UserRecDetailPage() {
  const params = useParams<{ workId: string }>();
  const router = useRouter();
  const { state } = useAllbluState();
  const baseWork = getWork(params.workId);

  const user = state.users.find((item) => item.id === state.currentUserId);
  const statuses = user ? state.workStatuses[user.id] ?? {} : {};

  const watchedWorks = useMemo(() => {
    if (!user) return [];
    return works.filter((work) => ["WATCHING", "DONE"].includes(statuses[work.id] ?? ""));
  }, [statuses, user]);

  const canAgree = watchedWorks.length > 0;

  const relatedPicks = useMemo(() => {
    if (!baseWork) return [] as Ollpick[];
    return state.picks
      .filter((pick) => pick.baseWorkId === baseWork.id)
      .sort((a, b) => b.agreeUserIds.length - a.agreeUserIds.length);
  }, [baseWork, state.picks]);

  const recommendationRows = useMemo(() => {
    if (!baseWork) return [] as { work: Work; pick: Ollpick }[];

    const fromPicks = relatedPicks
      .map((pick) => {
        const work = getWork(pick.recommendedWorkId);
        return work ? { work, pick } : null;
      })
      .filter((item): item is { work: Work; pick: Ollpick } => item != null);

    if (fromPicks.length >= 3) return fromPicks;

    const used = new Set(fromPicks.map((item) => item.work.id));
    const fallback = worksByType(baseWork.type)
      .filter((work) => work.id !== baseWork.id && !used.has(work.id))
      .slice(0, 3 - fromPicks.length)
      .map((work, index) => ({
        work,
        pick: {
          id: `fallback-${baseWork.id}-${work.id}`,
          baseWorkId: baseWork.id,
          recommendedWorkId: work.id,
          firstRecommender: "올블루",
          agreeUserIds: Array.from({ length: 40 + index * 28 }, (_, i) => `f-${i}`),
          reasons: [
            {
              id: `fallback-reason-a-${work.id}`,
              userId: "guest-a",
              nickname: "katzvvy",
              content: "둘 다 다크한 액션 배틀물이면서 개그 타이밍이 비슷해요.",
              createdAt: new Date(Date.now() - index * 3600_000).toISOString(),
            },
            {
              id: `fallback-reason-b-${work.id}`,
              userId: "guest-b",
              nickname: "anijjang",
              content: "작화·연출 텐션도 나란히 상위권이라 이어보기 좋아요.",
              createdAt: new Date(Date.now() - (index + 2) * 7200_000).toISOString(),
            },
            {
              id: `fallback-reason-c-${work.id}`,
              userId: "demo",
              nickname: "올블루",
              content: `${baseWork.title}를 좋아한다면 ${work.title}의 분위기와 전개도 잘 맞을 거예요.`,
              createdAt: new Date(Date.now() - (index + 4) * 10_000_000).toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
        } satisfies Ollpick,
      }));

    return [...fromPicks, ...fallback];
  }, [baseWork, relatedPicks]);

  if (!baseWork) notFound();

  /** 클릭 시 작성 페이지로 전환 (모달 X) */
  const openWrite = (recommendedId = "") => {
    if (!user) {
      showToast("로그인이 필요한 기능입니다");
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
    if (recommendedId) paramsQs.set("recommended", recommendedId);
    router.push(`/ollpick/write?${paramsQs.toString()}`);
  };

  return (
    <AppShell>
      <div className="px-5 py-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Left: 기준작 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
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
            <button
              type="button"
              onClick={() => openWrite()}
              className="btn-primary mt-5 h-11 w-full text-sm"
            >
              + 내 추천 작성하기
            </button>
            <Link
              href="/ollpick"
              className="mt-3 block text-center text-xs font-bold text-muted hover:text-brand"
            >
              올블픽 홈으로
            </Link>
          </aside>

          {/* Right: 추천 목록 */}
          <section className="space-y-5">
            {recommendationRows.length ? (
              recommendationRows.map(({ work, pick }) => (
                <RecommendationBlock
                  key={`${pick.id}-${work.id}`}
                  baseTitle={baseWork.title}
                  work={work}
                  pick={pick}
                  userId={user?.id}
                  status={user ? statuses[work.id] : undefined}
                  canAgree={canAgree}
                  onWrite={() => openWrite(work.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
                <p className="font-black">아직 추천한 작품이 없어요</p>
                <button
                  type="button"
                  onClick={() => openWrite()}
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
  onWrite,
}: {
  baseTitle: string;
  work: Work;
  pick: Ollpick;
  userId?: string;
  status?: import("@/lib/types").WorkStatus;
  canAgree: boolean;
  onWrite: () => void;
}) {
  const [openReasons, setOpenReasons] = useState(false);
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [reason, setReason] = useState("");

  /** 이유글 정렬 = 최근 작성한 글 최상단 */
  const reasons = useMemo(
    () =>
      [...pick.reasons].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      ),
    [pick.reasons]
  );
  const visibleReasons = openReasons ? reasons : reasons.slice(0, 2);
  const alreadyAgreed = userId ? pick.agreeUserIds.includes(userId) : false;
  const isFallback = pick.id.startsWith("fallback-");
  const particle = endsWithBatchim(work.title) ? "을" : "를";

  const beginAgree = () => {
    if (!userId) {
      showToast("로그인이 필요한 기능입니다");
      return;
    }
    if (!canAgree) {
      showToast("본 작품(보는중/완료) 등록 후 동의할 수 있습니다");
      return;
    }
    /** fallback(아직 DB 추천 없음)은 작성 페이지로 유도 */
    if (isFallback) {
      onWrite();
      return;
    }
    if (alreadyAgreed) {
      showToast("이미 동의한 추천입니다");
      return;
    }
    setAgreeOpen(true);
  };

  const submitAgree = async () => {
    if (!userId || alreadyAgreed || isFallback) return;
    if (reason.trim().length < 10 || reason.length > 200) {
      alert("추천 이유는 10자 이상 200자 이하로 작성해주세요.");
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
      <div className="flex gap-4">
        <div className="w-[88px] shrink-0">
          <WorkThumbnail work={work} userId={userId} status={status} showMeta={false} />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/works/${work.id}`}
            className="text-lg font-black tracking-tight hover:text-brand"
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
              disabled={!isFallback && alreadyAgreed}
              onClick={beginAgree}
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {alreadyAgreed && !isFallback ? "동의함" : "+ 동의하기"}
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
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
                {item.nickname.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold">{item.nickname}</p>
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

        {/* 동의 = 추천 이유글 작성 (댓글 아님) */}
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
                    setAgreeOpen(false);
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
