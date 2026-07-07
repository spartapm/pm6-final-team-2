import Link from "next/link";
import { getWork } from "@/lib/works";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  const work = getWork(review.workId);
  if (!work) return null;

  return (
    <Link href={`/reviews/${review.id}`} className="block rounded-xl border border-line bg-white p-3 hover:bg-blueSoft">
      <div className={`mb-3 h-28 rounded-lg bg-gradient-to-br ${work.coverTone}`} />
      <h3 className="mb-2 font-black">{work.title}</h3>
      <p className="mb-3 text-sm text-muted">작품 평가글</p>
      <p className="line-clamp-3 text-sm leading-relaxed">{review.content}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>{review.nickname}</span>
        <span>★{review.rating} · 공감 {review.likeCount}</span>
      </div>
    </Link>
  );
}
