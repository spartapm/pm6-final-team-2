"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import WorkThumbnail from "@/components/WorkThumbnail";
import { updateReview } from "@/lib/store";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork } from "@/lib/works";

export default function ReviewEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, ready } = useAllbluState();
  const review = state.reviews.find((item) => item.id === params.id);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const userId = state.currentUserId;
  const work = review ? getWork(review.workId) : undefined;
  const isAuthor = Boolean(userId && review && userId === review.userId);
  const userStatus =
    userId && work ? state.workStatuses[userId]?.[work.id] : undefined;

  useEffect(() => {
    if (!review) return;
    setRating(review.rating);
    setContent(review.content);
    setHydrated(true);
  }, [review]);

  useEffect(() => {
    if (!ready || !hydrated) return;
    if (!review || !isAuthor) {
      router.replace(review ? `/reviews/${review.id}` : "/");
    }
  }, [ready, hydrated, review, isAuthor, router]);

  if (ready && !review) notFound();
  if (!review || !work || !hydrated) {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-sm text-muted">불러오는 중…</div>
      </AppShell>
    );
  }

  const save = async () => {
    if (!userId || !isAuthor) return;
    if (content.trim().length < 10 || content.length > 1000) {
      alert("글자수는 10자에서 1000자 사이로 입력해주세요.");
      return;
    }
    const result = await updateReview(review.id, userId, {
      rating,
      content: content.trim(),
    });
    if (!result.ok) {
      alert(result.message);
      return;
    }
    router.push(`/reviews/${review.id}`);
  };

  return (
    <AppShell>
      <section className="px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-white p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="w-[120px] shrink-0">
              <WorkThumbnail
                work={work}
                userId={userId}
                status={userStatus}
                showMeta={false}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                      {review.nickname.slice(0, 1)}
                    </span>
                    <span className="text-sm font-bold">{review.nickname}</span>
                  </div>
                  <p className="text-lg font-black text-brandDeep">{work.title}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted">평점</span>
                      <div className="flex gap-0.5 text-base">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={star <= rating ? "text-yellow-400" : "text-slate-300"}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <span className="text-sm font-black">{rating.toFixed(1)}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-muted">
                      👍 {review.likeCount}개
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void save()}
                      className="rounded-full bg-brandDeep px-5 py-2 text-sm font-bold text-white"
                    >
                      저장
                    </button>
                    <Link
                      href={`/reviews/${review.id}`}
                      className="rounded-full border border-line bg-white px-5 py-2 text-sm font-bold text-ink"
                    >
                      취소
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <textarea
            value={content}
            maxLength={1000}
            onChange={(event) => setContent(event.target.value.slice(0, 1000))}
            placeholder="이 작품에 대한 생각을 10자 이상 남겨주세요."
            className="mt-5 min-h-[240px] w-full resize-none rounded-xl border border-line bg-white p-5 text-sm leading-7 outline-none"
          />
          <p className="mt-2 text-xs text-muted">{content.length}/1000</p>
        </div>
      </section>
    </AppShell>
  );
}
