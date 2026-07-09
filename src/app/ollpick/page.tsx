"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import OllpickFeedCard from "@/components/OllpickFeedCard";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showToast } from "@/components/Toast";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";
import type { Ollpick } from "@/lib/types";

export default function OllpickPage() {
  const router = useRouter();
  const { state } = useAllbluState();
  const topRef = useRef<HTMLDivElement>(null);

  const user = state.users.find((item) => item.id === state.currentUserId);
  const statuses = user ? state.workStatuses[user.id] ?? {} : {};

  const watchedWorks = useMemo(() => {
    if (!user) return [];
    return works.filter((work) => ["WATCHING", "DONE"].includes(statuses[work.id] ?? ""));
  }, [statuses, user]);

  const hasWatched = watchedWorks.length > 0;
  const canAgree = hasWatched;

  const latestPicks = useMemo(
    () =>
      [...state.picks].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      ),
    [state.picks]
  );

  const feedPicks = useMemo(() => {
    if (!hasWatched) return [];
    const watchedIds = new Set(watchedWorks.map((work) => work.id));
    const related = latestPicks.filter(
      (pick) => watchedIds.has(pick.baseWorkId) || watchedIds.has(pick.recommendedWorkId)
    );
    return related.length ? related : latestPicks;
  }, [hasWatched, latestPicks, watchedWorks]);

  const myReasonCount = user
    ? state.picks.reduce(
        (sum, pick) => sum + pick.reasons.filter((reason) => reason.userId === user.id).length,
        0
      )
    : 0;

  const myAgreeReceived = user
    ? state.picks
        .filter((pick) => pick.reasons.some((reason) => reason.userId === user.id))
        .reduce((sum, pick) => sum + Math.max(0, pick.agreeUserIds.length - 1), 0)
    : 0;

  const unrecommendedWorks = useMemo(() => {
    if (!user) return [];
    const recommendedBaseIds = new Set(
      state.picks
        .filter((pick) => pick.reasons.some((reason) => reason.userId === user.id))
        .map((pick) => pick.baseWorkId)
    );
    return watchedWorks.filter((work) => !recommendedBaseIds.has(work.id)).slice(0, 5);
  }, [state.picks, user, watchedWorks]);

  const openWrite = (baseId = "") => {
    if (!user) {
      showToast("로그인이 필요한 기능입니다");
      return;
    }
    if (!hasWatched) {
      showToast("본 작품(보는중/완료)을 먼저 등록해주세요");
      return;
    }
    const query = baseId ? `?base=${encodeURIComponent(baseId)}` : "";
    router.push(`/ollpick/write${query}`);
  };

  const scrollTop = (dir: -1 | 1) => {
    topRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <AppShell>
      <div className="px-5 py-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">올블픽</h1>
          <p className="mt-2 text-sm text-muted">
            다른 유저들이 남긴 &apos;이 작품이 좋다면, 이것도 좋아할 거예요&apos; 추천을 모아봤어요.
          </p>
        </header>

        {/* Latest recommendations carousel */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-black">✅ 최신 반영 추천</h2>
          <div className="flex items-center gap-2">
            <CarouselArrow label="이전" onClick={() => scrollTop(-1)}>
              ‹
            </CarouselArrow>
            <div
              ref={topRef}
              className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-2 scrollbar-thin"
            >
              {latestPicks.map((pick) => (
                <LatestPickCard key={pick.id} pick={pick} userId={user?.id} statuses={statuses} />
              ))}
            </div>
            <CarouselArrow label="다음" onClick={() => scrollTop(1)}>
              ›
            </CarouselArrow>
          </div>
        </section>

        {/* Watched works area */}
        <section>
          <h2 className="mb-4 text-lg font-black">✅ 내가 본 작품</h2>

          {!hasWatched ? (
            <EmptyWatched onGoRegister={() => router.push("/")} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                {feedPicks.map((pick) => (
                  <OllpickFeedCard
                    key={pick.id}
                    pick={pick}
                    userId={user?.id}
                    statuses={statuses}
                    canAgree={canAgree}
                  />
                ))}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <button
                  type="button"
                  onClick={() => openWrite()}
                  className="btn-primary h-12 w-full text-[15px]"
                >
                  + 내 추천 작성하기
                </button>

                <div className="rounded-2xl border border-line bg-white p-4">
                  <h3 className="mb-3 text-sm font-black">나의 추천 활동</h3>
                  <StatRow label="내가 남긴 추천 이유" value={`${myReasonCount}개`} />
                  <StatRow label="내 추천이 받은 동의" value={`${myAgreeReceived}`} />
                  <StatRow label="내가 본 작품 수" value={`${watchedWorks.length}편`} />
                </div>

                <div className="rounded-2xl border border-line bg-white p-4">
                  <h3 className="mb-3 text-sm font-black">✍️ 아직 추천이 없는 내 작품</h3>
                  {unrecommendedWorks.length ? (
                    <ul className="space-y-3">
                      {unrecommendedWorks.map((work) => (
                        <li key={work.id} className="flex items-center gap-3">
                          <div className="w-12 shrink-0">
                            <div
                              className={`aspect-[3/4] rounded-lg bg-gradient-to-br ${work.coverTone}`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-bold">{work.title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openWrite(work.id)}
                            className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
                          >
                            투고
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">추천할 작품이 모두 등록되었어요.</p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>

    </AppShell>
  );
}

function LatestPickCard({
  pick,
  userId,
  statuses,
}: {
  pick: Ollpick;
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
}) {
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  return (
    <article className="w-[220px] shrink-0 rounded-2xl border border-line bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <WorkThumbnail work={base} userId={userId} status={statuses[base.id]} compact showMeta={false} />
          <p className="mt-1 line-clamp-1 text-center text-[11px] font-bold">{base.title}</p>
        </div>
        <div>
          <WorkThumbnail
            work={recommended}
            userId={userId}
            status={statuses[recommended.id]}
            compact
            showMeta={false}
          />
          <p className="mt-1 line-clamp-1 text-center text-[11px] font-bold">{recommended.title}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className="line-clamp-1 font-bold text-muted">
          {pick.firstRecommender} 님이 추가함
        </span>
        <span className="shrink-0 font-bold text-brand">🧡 {pick.agreeUserIds.length}</span>
      </div>
      <Link
        href={`/ollpick/${pick.baseWorkId}`}
        className="mt-2 block text-center text-[11px] font-bold text-muted hover:text-brand"
      >
        상세 보기
      </Link>
    </article>
  );
}

function EmptyWatched({ onGoRegister }: { onGoRegister: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blueSoft text-3xl">
        🧭
      </div>
      <p className="text-lg font-black">아직 시청 인증된 작품이 없어요</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        작품을 보는중 또는 완료 상태로 등록하면 그 작품과 관련된 유저 추천을 여기서 바로 볼 수
        있어요.
      </p>
      <button type="button" onClick={onGoRegister} className="btn-primary mt-6 h-11 px-8">
        본 작품 등록하러 가기
      </button>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function CarouselArrow({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xl text-muted hover:bg-search sm:flex"
    >
      {children}
    </button>
  );
}
