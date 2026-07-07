import Link from "next/link";
import { getWork } from "@/lib/works";
import type { Ollpick } from "@/lib/types";

export default function PickCard({ pick }: { pick: Ollpick }) {
  const base = getWork(pick.baseWorkId);
  const recommended = getWork(pick.recommendedWorkId);
  if (!base || !recommended) return null;

  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <MiniWork id={base.id} title={base.title} tone={base.coverTone} label="좋아하신다면" />
        <div className="pt-12 text-xl font-black text-navy">→</div>
        <MiniWork id={recommended.id} title={recommended.title} tone={recommended.coverTone} label="추천해요" />
      </div>
      <div className="mt-4 rounded-xl bg-blueSoft p-3 text-sm">
        <p className="font-bold">최초 추천자 {pick.firstRecommender}</p>
        <p className="mt-1 text-muted">동의 {pick.agreeUserIds.length}명</p>
        <p className="mt-3 line-clamp-2">{pick.reasons[0]?.content}</p>
      </div>
    </article>
  );
}

function MiniWork({
  id,
  title,
  tone,
  label,
}: {
  id: string;
  title: string;
  tone: string;
  label: string;
}) {
  return (
    <Link href={`/works/${id}`} className="block">
      <div className={`thumbnail-ratio rounded-xl bg-gradient-to-br ${tone}`} />
      <p className="mt-2 text-xs text-muted">{label}</p>
      <h3 className="line-clamp-2 text-sm font-black">{title}</h3>
    </Link>
  );
}
