"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import ReviewCard from "@/components/ReviewCard";
import WorkThumbnail from "@/components/WorkThumbnail";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";

type Tab = "overview" | "anime" | "webtoon" | "posts";

export default function MyPage() {
  const router = useRouter();
  const { state } = useAllbluState();
  const [tab, setTab] = useState<Tab>("overview");
  const user = state.users.find((item) => item.id === state.currentUserId);
  const statuses = user ? state.workStatuses[user.id] ?? {} : {};
  const savedWorks = useMemo(
    () => works.filter((work) => Boolean(statuses[work.id])),
    [statuses]
  );
  const myReviews = user ? state.reviews.filter((review) => review.userId === user.id) : [];
  const myPicks = user ? state.picks.filter((pick) => pick.reasons.some((reason) => reason.userId === user.id)) : [];

  if (!user) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl bg-slate-100 p-10 text-center">
            <div className="text-4xl">🔒</div>
            <p className="mt-5 font-black">로그인 후 볼 수 있다는 문구</p>
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={() => router.push("/signup")} className="rounded bg-navy px-5 py-2 font-black text-white">
                회원가입
              </button>
              <button type="button" onClick={() => router.push("/login")} className="rounded border border-line px-5 py-2 font-black">
                로그인
              </button>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6">
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-navy to-slate-300" />
          <div className="px-6 pb-5">
            <div className="-mt-8 flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blueSoft text-3xl">
                👤
              </div>
              <div className="pb-2">
                <h1 className="text-2xl font-black">{user.nickname}</h1>
                <p className="text-sm text-muted">팔로워 0 · 팔로잉 0</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-line pt-4">
              {[
                ["overview", "개요"],
                ["anime", "애니"],
                ["webtoon", "웹툰"],
                ["posts", "내가 쓴 글"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key as Tab)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    tab === key ? "bg-navy text-white" : "bg-blueSoft text-navy"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {tab === "overview" && (
          <div className="mt-6 grid gap-6">
            <Summary title="최근 추가한 애니" works={savedWorks.filter((work) => work.type === "anime").slice(0, 10)} statuses={statuses} userId={user.id} />
            <Summary title="최근 추가한 웹툰" works={savedWorks.filter((work) => work.type === "webtoon").slice(0, 10)} statuses={statuses} userId={user.id} />
            <Panel title="내가 쓴 추천">
              {myPicks.slice(0, 3).map((pick) => (
                <p key={pick.id} className="border-b border-line py-3 last:border-0">
                  {getWork(pick.baseWorkId)?.title} → {getWork(pick.recommendedWorkId)?.title}
                </p>
              ))}
              {!myPicks.length && <p className="text-muted">아직 작성한 추천이 없습니다.</p>}
            </Panel>
            <Panel title="내가 쓴 평가">
              <div className="grid gap-4 md:grid-cols-3">
                {myReviews.slice(0, 3).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
              {!myReviews.length && <p className="text-muted">아직 작성한 평가가 없습니다.</p>}
            </Panel>
          </div>
        )}

        {(tab === "anime" || tab === "webtoon") && (
          <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black">{tab === "anime" ? "애니 보관함" : "웹툰 보관함"}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {savedWorks.filter((work) => work.type === tab).map((work) => (
                <WorkThumbnail key={work.id} work={work} userId={user.id} status={statuses[work.id]} />
              ))}
            </div>
            {!savedWorks.filter((work) => work.type === tab).length && (
              <p className="text-muted">상태를 지정한 작품이 없습니다.</p>
            )}
          </section>
        )}

        {tab === "posts" && (
          <div className="mt-6 grid gap-6">
            <Panel title="추천 글 관리">
              {myPicks.map((pick) => (
                <div key={pick.id} className="grid gap-2 border-b border-line py-3 text-sm md:grid-cols-4">
                  <span>{getWork(pick.baseWorkId)?.title}</span>
                  <span>{getWork(pick.recommendedWorkId)?.title}</span>
                  <span className="md:col-span-1">{pick.reasons[0]?.content}</span>
                  <span>{new Date(pick.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
              ))}
              {!myPicks.length && <p className="text-muted">작성한 추천 글이 없습니다.</p>}
            </Panel>
            <Panel title="평가 글 관리">
              <div className="grid gap-4 md:grid-cols-3">
                {myReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-black">{title}</h2>
      {children}
    </section>
  );
}

function Summary({
  title,
  works: items,
  statuses,
  userId,
}: {
  title: string;
  works: typeof works;
  statuses: Record<string, string>;
  userId: string;
}) {
  return (
    <Panel title={title}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {items.map((work) => (
          <WorkThumbnail key={work.id} work={work} userId={userId} status={statuses[work.id] as never} compact />
        ))}
      </div>
      {!items.length && <p className="text-muted">아직 추가한 작품이 없습니다.</p>}
    </Panel>
  );
}
