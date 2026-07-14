"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import CarouselNavButton from "@/components/CarouselNavButton";
import OllpickFeedCard from "@/components/OllpickFeedCard";
import PickCard from "@/components/PickCard";
import SectionHeading, { sectionIcons } from "@/components/SectionHeading";
import WorkCoverImage from "@/components/WorkCoverImage";
import { showLoginRequired, showToast } from "@/components/Toast";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";
import type { Ollpick } from "@/lib/types";

/** 홈과 동일: 한 화면 3카드, 최대 20개 */
const RECENT_PICK_PAGE_SIZE = 3;
const RECENT_PICK_MAX = 20;

export default function OllpickPage() {
  const router = useRouter();
  const { state, worksRevision } = useAllbluState();

  const user = state.users.find((item) => item.id === state.currentUserId);
  const statuses = user ? state.workStatuses[user.id] ?? {} : {};

  const watchedWorks = useMemo(() => {
    if (!user) return [];
    return works.filter((work) => ["WATCHING", "DONE"].includes(statuses[work.id] ?? ""));
  }, [statuses, user, worksRevision]);

  const hasWatched = watchedWorks.length > 0;

  const latestPicks = useMemo(
    () =>
      [...state.picks]
        .filter((pick) => getWork(pick.baseWorkId) && getWork(pick.recommendedWorkId))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, RECENT_PICK_MAX),
    [state.picks, worksRevision]
  );

  const feedPicks = useMemo(() => {
    if (!hasWatched) return [];
    const watchedIds = new Set(watchedWorks.map((work) => work.id));
    // 기준작(좌측)만 보는중/완료면 노출 — 추천작(우측) 상태는 무시
    return state.picks
      .filter((pick) => watchedIds.has(pick.baseWorkId))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [hasWatched, state.picks, watchedWorks]);

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
      showLoginRequired("recommend_write");
      return;
    }
    if (!hasWatched) {
      showToast("본 작품(보는중/완료)을 먼저 등록해주세요");
      return;
    }
    const query = baseId ? `?base=${encodeURIComponent(baseId)}` : "";
    router.push(`/ollpick/write${query}`);
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

        {/* 홈과 동일: 방금 올라온 올블픽 (3카드 × 최대 20) — 올블픽은 애니/웹툰 통합 */}
        <RecentPickCarousel picks={latestPicks} userId={user?.id} statuses={statuses} />

        {/* 추천 피드 — 위 캐러셀 PickCard 열과 좌우 정렬 */}
        <section className="mt-8">
          <SectionHeading
            title={`${user?.nickname ?? "유저"}님과 같은 작품을 본 사람들이 추천했어요`}
            icon={sectionIcons.spyglassSeen}
            className="mb-4"
          />

          {!hasWatched ? (
            <EmptyWatched onGoRegister={() => router.push("/")} />
          ) : (
            <div className="sm:px-5">
              <div className="flex items-start gap-2 md:gap-3">
                {/* 캐러셀 좌측 화살표(w-11)와 동일 여백 */}
                <div className="hidden w-11 shrink-0 sm:block" aria-hidden />
                <div className="grid min-w-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="min-w-0 space-y-4">
                    {feedPicks.map((pick) => (
                      <OllpickFeedCard
                        key={pick.id}
                        pick={pick}
                        userId={user?.id}
                        statuses={statuses}
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
                              <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">
                                <WorkCoverImage src={work.thumbnailUrl} alt={work.title} />
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
                <div className="hidden w-11 shrink-0 sm:block" aria-hidden />
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function RecentPickCarousel({
  picks,
  userId,
  statuses,
}: {
  picks: Ollpick[];
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(picks.length / RECENT_PICK_PAGE_SIZE));
  const visible = picks.slice(
    page * RECENT_PICK_PAGE_SIZE,
    page * RECENT_PICK_PAGE_SIZE + RECENT_PICK_PAGE_SIZE
  );

  useEffect(() => {
    setPage(0);
  }, [picks]);

  return (
    <section className="section-card">
      <div className="mb-4">
        <SectionHeading title="방금 올라온 올블픽" icon={sectionIcons.pearlPick} />
        <p className="mt-1 text-sm text-muted">유저가 직접 연결한 작품 추천이에요</p>
      </div>

      {picks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          아직 올라온 올블픽이 없습니다.
        </p>
      ) : (
        <div className="flex items-center gap-2 md:gap-3">
          <CarouselNavButton
            direction="left"
            label="이전"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          />

          <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-3">
            {visible.map((pick) => (
              <PickCard
                key={pick.id}
                pick={pick}
                userId={userId}
                statuses={statuses}
                surface="ollpick_top"
              />
            ))}
          </div>

          <CarouselNavButton
            direction="right"
            label="다음"
            disabled={page >= pages - 1}
            onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
          />
        </div>
      )}
    </section>
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
