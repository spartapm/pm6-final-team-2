"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork } from "@/lib/works";

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useAllbluState();
  const review = state.reviews.find((item) => item.id === params.id);
  if (!review) notFound();
  const work = getWork(review.workId);
  const isAuthor = state.currentUserId === review.userId;

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <button type="button" onClick={() => router.back()} className="mb-5 font-bold text-navy">
          ← 뒤로가기
        </button>
        <article className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">{work?.title}</p>
          <div className="mt-3 flex items-center justify-between">
            <h1 className="text-2xl font-black">{review.nickname}</h1>
            <span className="font-black text-yellow-500">★{review.rating}</span>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {isAuthor ? (
              <>
                <button type="button" className="rounded-full bg-slate-200 px-4 py-2 text-sm font-bold">
                  수정
                </button>
                <button type="button" className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-600">
                  삭제
                </button>
              </>
            ) : (
              <>
                <button type="button" className="rounded-full bg-blueSoft px-4 py-2 text-sm font-bold text-navy">
                  공감
                </button>
                <button type="button" className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white">
                  팔로우
                </button>
              </>
            )}
          </div>
          <p className="mt-6 whitespace-pre-line leading-relaxed">{review.content}</p>
          <div className="mt-8 flex items-center justify-between text-sm text-muted">
            <span>{new Date(review.createdAt).toLocaleDateString("ko-KR")}</span>
            <span>공감 {review.likeCount}</span>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
