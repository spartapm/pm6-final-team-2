"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showToast } from "@/components/Toast";
import {
  deleteReview,
  hasLikedReview,
  isFollowing,
  likeReview,
  toggleFollow,
} from "@/lib/store";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork } from "@/lib/works";

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, ready } = useAllbluState();
  const review = state.reviews.find((item) => item.id === params.id);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);

  const userId = state.currentUserId;
  const work = review ? getWork(review.workId) : undefined;
  const isAuthor = Boolean(userId && review && userId === review.userId);
  const userStatus =
    userId && work ? state.workStatuses[userId]?.[work.id] : undefined;

  useEffect(() => {
    if (!review || !userId) return;
    void (async () => {
      setFollowing(await isFollowing(review.userId, userId));
      setLiked(await hasLikedReview(review.id, userId));
    })();
  }, [review, userId, state]);

  if (ready && !review) notFound();
  if (!review || !work) {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-sm text-muted">불러오는 중…</div>
      </AppShell>
    );
  }

  const requireAuth = () => showToast("로그인이 필요한 기능입니다");

  const onLike = async () => {
    if (!userId) {
      requireAuth();
      return;
    }
    if (liked) return;
    await likeReview(review.id, userId);
    setLiked(true);
  };

  const onFollow = async () => {
    if (!userId) {
      requireAuth();
      return;
    }
    if (isAuthor) return;
    setFollowing(await toggleFollow(review.userId, userId));
  };

  const onDelete = async () => {
    if (!userId || !isAuthor) return;
    await deleteReview(review.id, userId);
    router.replace(`/works/${work.id}`);
  };

  return (
    <AppShell>
      <section className="px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-[#f3f6fb] p-5 md:p-7">
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
                  <Link
                    href={`/works/${work.id}`}
                    className="text-lg font-black text-brandDeep hover:underline"
                  >
                    {work.title}
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted">평점</span>
                      <span className="flex gap-0.5 text-base text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= review.rating ? "" : "text-slate-300"}
                          >
                            ★
                          </span>
                        ))}
                      </span>
                      <span className="text-sm font-black">
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-muted">
                      👍 {review.likeCount}개
                    </p>
                  </div>

                  {isAuthor ? (
                    <div className="flex gap-2">
                      <Link
                        href={`/reviews/${review.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
                      >
                        ✎ 수정
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onDelete()}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-red-500"
                      >
                        ✕ 삭제
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void onLike()}
                        className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white ${
                          liked ? "bg-brand/70" : "bg-brand"
                        }`}
                      >
                        👍 공감
                      </button>
                      <button
                        type="button"
                        onClick={() => void onFollow()}
                        className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold ${
                          following
                            ? "bg-brand text-white"
                            : "border border-line bg-white text-ink"
                        }`}
                      >
                        {following ? "✓ 팔로잉" : "+ 팔로우"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 min-h-[220px] rounded-xl border border-line bg-white p-5 text-sm leading-7 text-ink/90 whitespace-pre-wrap">
            {review.content}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>
              {new Date(review.createdAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
              })}
            </span>
            <Link href={`/works/${work.id}`} className="font-bold hover:text-brand">
              작품으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
