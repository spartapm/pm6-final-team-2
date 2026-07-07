"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import PickCard from "@/components/PickCard";
import ReviewCard from "@/components/ReviewCard";
import WorkThumbnail from "@/components/WorkThumbnail";
import { addReview, setWorkStatus } from "@/lib/store";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, statusOptions, works } from "@/lib/works";
import type { WorkStatus } from "@/lib/types";

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const work = getWork(params.id);
  const { state } = useAllbluState();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const user = state.users.find((item) => item.id === state.currentUserId);
  const userStatus = user ? state.workStatuses[user.id]?.[params.id] : undefined;
  const related = useMemo(() => works.filter((item) => item.type === work?.type && item.id !== work.id).slice(0, 6), [work]);

  if (!work) notFound();

  const submitReview = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (rating < 1 || content.length < 10 || content.length > 1000) {
      alert("글자수는 10자에서 1000자 사이로 입력해주세요.");
      return;
    }
    addReview({
      workId: work.id,
      userId: user.id,
      nickname: user.nickname,
      rating,
      content,
    });
    setRating(0);
    setContent("");
  };

  return (
    <AppShell>
      <div className="px-6 py-6">
        <section className="grid gap-6 rounded-2xl border border-line bg-white p-5 shadow-sm md:grid-cols-[220px_1fr]">
          <div className={`thumbnail-ratio rounded-xl bg-gradient-to-br ${work.coverTone}`} />
          <div>
            <p className="mb-2 text-sm font-bold text-muted">{work.type === "anime" ? "ANIME" : "WEBTOON"}</p>
            <h1 className="text-3xl font-black">{work.title}</h1>
            <p className="mt-3 text-lg font-bold">★{work.rating?.toFixed(1) ?? "-/5"} / 참여 {work.ratingCount.toLocaleString()}명</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {work.genres.map((genre) => (
                <span key={genre} className="rounded-full bg-blueSoft px-3 py-1 text-sm font-bold text-navy">
                  {genre}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {statusOptions.filter((item) => item.code !== "CANCEL").map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    if (!user) router.push("/login");
                    else setWorkStatus(user.id, work.id, option.code as WorkStatus);
                  }}
                  className={`rounded-lg border px-4 py-2 font-bold ${
                    userStatus === option.code ? "border-navy bg-navy text-white" : "border-line bg-white"
                  }`}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <Panel title="개요">
              <p className="leading-relaxed">{work.overview}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {work.platform.map((platform) => (
                  <a key={platform} href="#" className="rounded bg-navy px-3 py-2 text-sm font-bold text-white">
                    {platform}
                  </a>
                ))}
              </div>
            </Panel>

            <Panel
              title="이 작품 좋아하시면 이것도 좋아하실지 몰라요!"
              action={
                <button
                  type="button"
                  onClick={() => (user ? router.push("/ollpick") : router.push("/login"))}
                  className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-navy"
                >
                  내 추천 작성하기
                </button>
              }
            >
              <p className="mb-4 text-sm text-muted">
                상세 페이지 추천은 무한스크롤이 아니며, 최대 6개만 노출합니다.
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                {related.map((item) => (
                  <WorkThumbnail
                    key={item.id}
                    work={item}
                    userId={state.currentUserId}
                    status={user ? state.workStatuses[user.id]?.[item.id] : undefined}
                    compact
                  />
                ))}
              </div>
              <Link href="/ollpick" className="mt-4 inline-block text-sm font-bold text-navy underline">
                모든 추천 보기
              </Link>
            </Panel>

            <Panel title="작품 순서">
              <div className="divide-y divide-line rounded-xl border border-line">
                {related.slice(0, 5).map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/works/${item.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-blueSoft"
                  >
                    <span>순서 {index + 1}</span>
                    <span className="font-bold">{item.title}</span>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="작품 평가">
              <div className="mb-5 rounded-xl bg-blueSoft p-4">
                <p className="mb-3 font-bold">{user?.nickname ?? "비회원"}</p>
                <div className="mb-3 flex gap-1 text-2xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={!user}
                      onClick={() => setRating(star)}
                      className={star <= rating ? "text-yellow-500" : "text-slate-300"}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {!user && (
                  <div className="mb-3 rounded-lg bg-white p-3 text-sm font-bold text-red-600">
                    비회원은 플레이스 홀더 변경, 작성창 비활성화
                  </div>
                )}
                <textarea
                  disabled={!user}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={user ? "작품 평가를 10자 이상 작성해주세요." : "평가 작성은 로그인 후 이용 가능합니다."}
                  className="min-h-[120px] w-full resize-none rounded-lg border border-line p-3 disabled:bg-slate-100"
                />
                {user ? (
                  <button type="button" onClick={submitReview} className="mt-3 rounded bg-navy px-5 py-2 font-black text-white">
                    등록
                  </button>
                ) : (
                  <button type="button" onClick={() => router.push("/login")} className="mt-3 rounded bg-navy px-5 py-2 font-black text-white">
                    로그인하고 평가하기
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {state.reviews.filter((review) => review.workId === work.id).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </Panel>
          </div>
          <aside className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black">상세정보</h2>
            <Info label="원작" value={work.meta.original ?? work.title} />
            <Info label={work.type === "anime" ? "제작사" : "글"} value={work.meta.studio ?? work.meta.writer ?? "-"} />
            <Info label={work.type === "anime" ? "감독" : "그림"} value={work.meta.director ?? work.meta.illustrator ?? "-"} />
            <Info label="화수" value={work.meta.episodes} />
            <Info label={work.type === "anime" ? "방영기간" : "연재기간"} value={work.meta.period} />
            <Info label={work.type === "anime" ? "방영상태" : "연재상태"} value={work.statusLabel} />
          </aside>
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black">올블픽 추천</h2>
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

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line py-3 last:border-0">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
