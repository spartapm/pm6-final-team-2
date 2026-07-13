"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import PickCard from "@/components/PickCard";
import ReviewCard from "@/components/ReviewCard";
import SectionCarousel from "@/components/SectionCarousel";
import SectionHeading, { sectionIcons } from "@/components/SectionHeading";
import { buildRatingStatsMap } from "@/lib/ratings";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, worksByType } from "@/lib/works";
import type { Ollpick } from "@/lib/types";

/** 홈 올블픽: 기본 3카드 노출, 좌우로 최대 20카드 (무한스크롤 X) */
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

  const ratingStats = useMemo(
    () => buildRatingStatsMap(state.reviews),
    [state.reviews]
  );

  const rankWorks = useMemo(
    () => (rankTab === "anime" ? anime : webtoon).slice(0, HOME_RANK_MAX),
    [anime, rankTab, webtoon]
  );

  const recentPicks = useMemo(
    () => buildRecentPicks(state.picks).slice(0, HOME_PICK_MAX),
    [state.picks]
  );

  const popularReviews = useMemo(
    () =>
      [...state.reviews]
        .sort((a, b) => {
          if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
          return +new Date(b.createdAt) - +new Date(a.createdAt);
        })
        .slice(0, 3),
    [state.reviews]
  );

  return (
    <AppShell>
      <div className="space-y-6 px-5 py-5 lg:px-8">
        <section className="overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/allblu-hero-banner.svg"
            alt="ALLBLU — 본 작품, 볼 작품, 다시 보고 싶은 작품 전부 ALLBLU에 모아두세요"
            className="h-auto w-full"
            width={1200}
            height={315}
          />
        </section>

        <SectionCarousel
          title="인기작 순위 TOP 20"
          icon={sectionIcons.bigWave}
          works={rankWorks}
          userId={state.currentUserId}
          statuses={userStatuses}
          ratingStats={ratingStats}
          rank
          pageSize={6}
          tabs={[
            { id: "anime", label: "애니" },
            { id: "webtoon", label: "웹툰" },
          ]}
          activeTab={rankTab}
          onTabChange={(id) => setRankTab(id as "anime" | "webtoon")}
        />

        <section className="section-card">
          <SectionHeading
            title="인기평가"
            icon={sectionIcons.starfishRating}
            className="mb-4"
          />
          {popularReviews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              아직 등록된 평가가 없습니다.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {popularReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  userId={state.currentUserId}
                  status={userStatuses[review.workId]}
                />
              ))}
            </div>
          )}
        </section>

        <HomePickCarousel
          picks={recentPicks}
          userId={state.currentUserId}
          statuses={userStatuses}
        />
      </div>
    </AppShell>
  );
}

function HomePickCarousel({
  picks,
  userId,
  statuses,
}: {
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionHeading title="방금 올라온 올블픽" icon={sectionIcons.pearlPick} />
          <p className="mt-1 text-sm text-muted">유저가 직접 연결한 작품 추천이에요</p>
        </div>
        <Link
          href="/ollpick"
          className="shrink-0 text-sm font-bold text-muted transition hover:text-brand"
        >
          전체 보기 &gt;
        </Link>
      </div>

      {picks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          아직 올라온 올블픽이 없습니다.
        </p>
      ) : (
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
      )}
    </section>
  );
}

/** 최신순 올블픽 (유저가 올린 실데이터만, 최대 HOME_PICK_MAX) */
function buildRecentPicks(picks: Ollpick[]): Ollpick[] {
  return picks
    .filter((pick) => getWork(pick.baseWorkId) && getWork(pick.recommendedWorkId))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, HOME_PICK_MAX);
}
