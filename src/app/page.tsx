"use client";

import AppShell from "@/components/AppShell";
import PickCard from "@/components/PickCard";
import ReviewCard from "@/components/ReviewCard";
import SectionCarousel from "@/components/SectionCarousel";
import { useAllbluState } from "@/lib/useAllbluState";
import { worksByType } from "@/lib/works";

export default function HomePage() {
  const { state } = useAllbluState();
  const userStatuses = state.currentUserId ? state.workStatuses[state.currentUserId] ?? {} : {};
  const anime = worksByType("anime");
  const webtoon = worksByType("webtoon");

  return (
    <AppShell>
      <div className="space-y-6 px-6 py-5">
        <section className="rounded-xl bg-gradient-to-r from-navy to-navyDeep px-8 py-9 text-white">
          <p className="mb-2 text-xs font-bold tracking-widest">ANIME X WEBTOON ARCHIVE</p>
          <h1 className="text-2xl font-black leading-tight">
            본 작품, 볼 작품, 다시 보고 싶은 작품
            <br />
            전부 ALLBLU에 모아두세요~!
          </h1>
          <p className="mt-4 text-sm text-white/80">
            좋아한 세계관과 감상을 기반으로 새로운 애니·웹툰 추천을 가장 쉬운 방식으로 만납니다.
          </p>
        </section>

        <SectionCarousel
          title="🔥 인기작 순위 TOP 20"
          works={[...anime, ...webtoon].slice(0, 20)}
          userId={state.currentUserId}
          statuses={userStatuses}
          rank
        />

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black">🏆 인기평가</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {state.reviews.slice(0, 3).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>

        <SectionCarousel
          title="🌸 최근 추가된 애니 추천"
          works={anime.slice(0, 18)}
          userId={state.currentUserId}
          statuses={userStatuses}
        />
        <SectionCarousel
          title="🌸 최근 추가된 웹툰 추천"
          works={webtoon.slice(0, 18)}
          userId={state.currentUserId}
          statuses={userStatuses}
        />

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black">💙 최신 올블픽</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {state.picks.slice(0, 2).map((pick) => (
              <PickCard key={pick.id} pick={pick} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
