"use client";

import Link from "next/link";
import WorkThumbnail from "./WorkThumbnail";
import UserNicknameLink from "./UserNicknameLink";
import { getWork } from "@/lib/works";
import type { Review, WorkStatus } from "@/lib/types";

/** 홈 인기평가 카드 — 썸네일(상태버튼) + 제목·평가·닉네임·공감수. 클릭 시 평가 상세. */
export default function ReviewCard({
  review,
  userId,
  status,
}: {
  review: Review;
  userId?: string;
  status?: WorkStatus;
}) {
  const work = getWork(review.workId);
  if (!work) return null;

  const detailHref = `/reviews/${review.id}`;

  return (
    <article className="flex min-h-[140px] gap-3 overflow-hidden rounded-2xl border border-line bg-white p-3 transition hover:shadow-card">
      <div className="w-[88px] shrink-0 sm:w-[96px]">
        <WorkThumbnail
          work={work}
          userId={userId}
          status={status}
          showMeta={false}
          href={detailHref}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <Link href={detailHref} className="min-w-0">
          <h3 className="line-clamp-1 text-[15px] font-black text-ink">{work.title}</h3>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">
            {review.content}
          </p>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted">
          <UserNicknameLink
            userId={review.userId}
            className="inline-flex min-w-0 items-center gap-2 font-bold hover:text-brand"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-search text-[10px] text-ink">
              {review.nickname.slice(0, 1)}
            </span>
            <span className="line-clamp-1">{review.nickname}</span>
          </UserNicknameLink>
          <Link
            href={detailHref}
            className="inline-flex shrink-0 items-center gap-1 font-bold hover:text-brand"
          >
            <HeartIcon />
            공감 {review.likeCount.toLocaleString()}개
          </Link>
        </div>
      </div>
    </article>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.5s-7.2-4.35-9.3-8.1C1.2 9.45 2.55 6.5 5.4 6.5c1.7 0 3.15 1 3.9 2.4.75-1.4 2.2-2.4 3.9-2.4 2.85 0 4.2 2.95 2.7 5.9C19.2 16.15 12 20.5 12 20.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
