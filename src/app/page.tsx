"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PickCard from "@/components/PickCard";
import ReviewCard from "@/components/ReviewCard";
import SectionCarousel from "@/components/SectionCarousel";
import { useAllbluState } from "@/lib/useAllbluState";
import { worksByType } from "@/lib/works";
import type { Ollpick } from "@/lib/types";

/** 홈 최근 추천: 기본 3카드 노출, 좌우로 최대 20카드 (무한스크롤 X) */
const HOME_PICK_PAGE_SIZE = 3;
const HOME_PICK_MAX = 20;
/** 인기작: 기본 6개, 좌우로 최대 20개 (무한스크롤 X) */
const HOME_RANK_MAX = 20;

export default function HomePage() {
  const { state } = useAllbluState();
  const userStatuses = state.currentUserId ? state.workStatuses[state.currentUserId] ?? {} : {};
  const anime = worksByType("anime");
  const webtoon = worksByType("webtoon");
  const [rankTab, setRankTab] = useState<"anime" | "webtoon">("anime");

  const rankWorks = useMemo(
    () => (rankTab === "anime" ? anime : webtoon).slice(0, HOME_RANK_MAX),
    [anime, rankTab, webtoon]
  );

  const animePicks = useMemo(
    () => ensurePickPairs(state.picks, anime, "anime").slice(0, HOME_PICK_MAX),
    [state.picks, anime]
  );
  const webtoonPicks = useMemo(
    () => ensurePickPairs(state.picks, webtoon, "webtoon").slice(0, HOME_PICK_MAX),
    [state.picks, webtoon]
  );

  const popularReviews = useMemo(
    () =>
      [...state.reviews]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 3),
    [state.reviews]
  );

  return (
    <AppShell>
      <div className="space-y-6 px-5 py-5 lg:px-8">
        {/* ATF: 히어로 + 인기작 */}
        <section className="rounded-2xl bg-gradient-to-br from-navy via-navyDeep to-[#06102a] px-7 py-10 text-white md:px-10">
          <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-white/70">
            ANIME x WEBTOON ARCHIVE
          </p>
          <h1 className="max-w-3xl text-[28px] font-black leading-tight md:text-[34px]">
            본 작품, 볼 작품, 다시 보고 싶은 작품
            <br />
            전부 ALLBLU에 모아두세요~!
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">
            흩어진 시청 기록을 정리하고, 취향에 맞는 애니·웹툰 명작을 가장 쉬운 방식으로
            발견하세요.
          </p>
        </section>

        <SectionCarousel
          title="🔥 인기작 순위 TOP 20"
          works={rankWorks}
          userId={state.currentUserId}
          statuses={userStatuses}
          rank
          pageSize={6}
          tabs={[
            { id: "anime", label: "애니" },
            { id: "webtoon", label: "웹툰" },
          ]}
          activeTab={rankTab}
          onTabChange={(id) => setRankTab(id as "anime" | "webtoon")}
        />

        {/* BTF: 인기평가 + 최근 추천 */}
        <section className="section-card">
          <h2 className="mb-4 text-lg font-black">⭐ 인기평가</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {popularReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>

        <HomePickCarousel
          title="🎀 최근 추가된 애니 추천"
          picks={animePicks}
          userId={state.currentUserId}
          statuses={userStatuses}
        />
        <HomePickCarousel
          title="🎀 최근 추가된 웹툰 추천"
          picks={webtoonPicks}
          userId={state.currentUserId}
          statuses={userStatuses}
        />
      </div>
    </AppShell>
  );
}

function HomePickCarousel({
  title,
  picks,
  userId,
  statuses,
}: {
  title: string;
  picks: Ollpick[];
  userId?: string;
  statuses: Record<string, import("@/lib/types").WorkStatus>;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(picks.length / HOME_PICK_PAGE_SIZE));
  const visible = picks.slice(
    page * HOME_PICK_PAGE_SIZE,
    page * HOME_PICK_PAGE_SIZE + HOME_PICK_PAGE_SIZE
  );

  useEffect(() => {
    setPage(0);
  }, [picks]);

  return (
    <section className="section-card">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          aria-label="이전"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xl text-muted hover:bg-search disabled:opacity-30 sm:flex"
        >
          ‹
        </button>

        <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-3">
          {visible.map((pick) => (
            <PickCard key={pick.id} pick={pick} userId={userId} statuses={statuses} />
          ))}
        </div>

        <button
          type="button"
          aria-label="다음"
          disabled={page >= pages - 1}
          onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xl text-muted hover:bg-search disabled:opacity-30 sm:flex"
        >
          ›
        </button>
      </div>
      </section>
  );
}

function ensurePickPairs(
  picks: Ollpick[],
  pool: ReturnType<typeof worksByType>,
  prefix: string
): Ollpick[] {
  const typed = picks.filter((pick) => {
    const base = pool.find((work) => work.id === pick.baseWorkId);
    const rec = pool.find((work) => work.id === pick.recommendedWorkId);
    return Boolean(base && rec);
  });

  const generated: Ollpick[] = [...typed];
  for (let i = 0; i < pool.length - 1 && generated.length < HOME_PICK_MAX; i += 2) {
    const base = pool[i];
    const recommended = pool[i + 1];
    if (!base || !recommended) continue;
    if (
      generated.some(
        (pick) => pick.baseWorkId === base.id && pick.recommendedWorkId === recommended.id
      )
    ) {
      continue;
    }
    generated.push({
      id: `${prefix}-home-pick-${i}`,
      baseWorkId: base.id,
      recommendedWorkId: recommended.id,
      firstRecommender: i % 3 === 0 ? "Soya" : i % 3 === 1 ? "올블루" : "TEMPPY",
      agreeUserIds: Array.from({ length: 20 + (i % 40) }, (_, idx) => `${prefix}-a-${i}-${idx}`),
      reasons: [
        {
          id: `${prefix}-reason-${i}`,
          userId: "demo",
          nickname: "올블루",
          content: `${base.title}를 좋아한다면 ${recommended.title}도 추천해요.`,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    });
  }
  return generated.slice(0, HOME_PICK_MAX);
}
