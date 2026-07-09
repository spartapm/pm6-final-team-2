import Link from "next/link";
import { getWork } from "@/lib/works";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  const work = getWork(review.workId);
  if (!work) return null;

  return (
    <Link
      href={`/reviews/${review.id}`}
      className="block overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-card"
    >
      <div className={`h-36 bg-gradient-to-br ${work.coverTone}`} />
      <div className="p-4">
        <h3 className="mb-1 line-clamp-1 text-[15px] font-black">{work.title}</h3>
        <p className="mb-2 text-xs font-bold text-muted">작품 평가글</p>
        <p className="line-clamp-3 min-h-[60px] text-sm leading-relaxed text-ink/80">
          {review.content}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-2 font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-search text-[10px] text-ink">
              {review.nickname.slice(0, 1)}
            </span>
            {review.nickname}
          </span>
          <span className="font-bold">공감 {review.likeCount.toLocaleString()}개</span>
        </div>
      </div>
    </Link>
  );
}
