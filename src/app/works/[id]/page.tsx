"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showToast } from "@/components/Toast";
import {
  addReview,
  hasLikedReview,
  likeReview,
  toggleWorkStatus,
} from "@/lib/store";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works, worksByType } from "@/lib/works";
import type { Work, WorkStatus, WorkType } from "@/lib/types";

/** 상세 시청상태: 활성 재클릭 시 해제(토글). 활성=brand / 비활성=흰 테두리 */
const STATUS_BUTTONS: { code: WorkStatus; label: string; icon: string }[] = [
  { code: "WATCHING", label: "보는중", icon: "▶" },
  { code: "DONE", label: "완료", icon: "✅" },
  { code: "KEEP", label: "볼 예정", icon: "📌" },
  { code: "STOPPED", label: "중단", icon: "⏸" },
];

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const work = getWork(params.id);
  const { state } = useAllbluState();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [recType, setRecType] = useState<WorkType | null>(null);
  const [seriesOrder, setSeriesOrder] = useState<"air" | "timeline">("air");

  const user = state.users.find((item) => item.id === state.currentUserId);
  const userStatuses = user ? state.workStatuses[user.id] ?? {} : {};
  const userStatus = user ? userStatuses[params.id] : undefined;
  const workId = work?.id ?? "";
  const activeRecType: WorkType = recType ?? work?.type ?? "anime";

  const myReview = user
    ? state.reviews.find((review) => review.workId === workId && review.userId === user.id)
    : undefined;

  const workReviews = useMemo(
    () =>
      state.reviews
        .filter((review) => review.workId === workId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.reviews, workId]
  );

  const recommendations = useMemo(() => {
    if (!workId) return [];
    const fromPicks = state.picks
      .filter((pick) => pick.baseWorkId === workId)
      .map((pick) => getWork(pick.recommendedWorkId))
      .filter((item): item is Work => item != null && item.type === activeRecType);

    if (fromPicks.length >= 6) return fromPicks.slice(0, 6);

    const fallback = worksByType(activeRecType)
      .filter((item) => item.id !== workId && !fromPicks.some((pick) => pick.id === item.id))
      .slice(0, 6 - fromPicks.length);

    return [...fromPicks, ...fallback].slice(0, 6);
  }, [activeRecType, state.picks, workId]);

  const series = useMemo(() => (work ? buildSeries(work) : []), [work]);

  if (!work) notFound();

  const requireAuth = () => {
    showToast("로그인이 필요한 기능입니다");
  };

  const onStatusClick = (code: WorkStatus) => {
    if (!user) {
      requireAuth();
      return;
    }
    void toggleWorkStatus(user.id, work.id, code);
  };

  const submitReview = async () => {
    if (!user) {
      requireAuth();
      return;
    }
    if (myReview) return;
    if (rating < 1 || content.trim().length < 10 || content.length > 1000) {
      alert("글자수는 10자에서 1000자 사이로 입력해주세요.");
      return;
    }
    const result = await addReview({
      workId: work.id,
      userId: user.id,
      nickname: user.nickname,
      rating,
      content: content.trim(),
    });
    if (!result.ok) {
      alert(result.message);
      return;
    }
    setRating(0);
    setContent("");
  };

  const onLike = async (reviewId: string) => {
    if (!user) {
      requireAuth();
      return;
    }
    if (await hasLikedReview(reviewId, user.id)) return;
    await likeReview(reviewId, user.id);
  };

  const overview =
    work.overview.length > 90 && !overviewOpen
      ? `${work.overview.slice(0, 90)}…`
      : work.overview;

  const ratingValue = work.rating ?? 0;

  return (
    <AppShell>
      <div className="px-5 py-6 lg:px-8">
        {/* Hero summary */}
        <section className="grid gap-6 md:grid-cols-[200px_1fr]">
          <div className="relative mx-auto w-full max-w-[200px]">
            <WorkThumbnail
              work={work}
              userId={state.currentUserId}
              status={userStatus}
              showMeta={false}
            />
          </div>

          <div className="min-w-0 pt-1">
            <h1 className="text-[28px] font-black tracking-tight md:text-[34px]">{work.title}</h1>
            <p className="mt-2 text-sm font-bold text-muted">
              {work.type === "anime" ? "애니" : "웹툰"} · {work.statusLabel}
              {work.genres.length ? ` · ${work.genres.join("/")}` : ""}
              {work.meta.original && work.meta.original !== work.title
                ? ` · ${work.meta.original}`
                : ""}
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black leading-none">
                {work.rating ? work.rating.toFixed(1) : "-"}
              </span>
              <div>
                <div className="flex gap-0.5 text-xl text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= Math.round(ratingValue) ? "" : "text-slate-200"}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs font-bold text-muted">
                  {work.ratingCount.toLocaleString()}명 평가
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-sm font-black text-ink">[시청 상태]</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_BUTTONS.map((button) => {
                  const active = userStatus === button.code;
                  return (
                    <button
                      key={button.code}
                      type="button"
                      onClick={() => onStatusClick(button.code)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-white text-ink hover:bg-surface"
                      }`}
                    >
                      <span className="text-xs">{button.icon}</span>
                      {button.label}
                    </button>
                  );
                })}
              </div>
              {user ? (
                <p className="mt-2 text-[11px] text-muted">
                  활성 버튼을 다시 누르면 시청 상태가 해제됩니다.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Overview + platforms + sidebar */}
        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <section>
              <h2 className="mb-2 text-base font-black">[개요]</h2>
              <p className="text-sm leading-7 text-ink/85">{overview}</p>
              {work.overview.length > 90 ? (
                <button
                  type="button"
                  onClick={() => setOverviewOpen((value) => !value)}
                  className="mt-1 text-xs font-bold text-brand"
                >
                  {overviewOpen ? "접기" : "더보기"}
                </button>
              ) : null}
            </section>

            <section>
              <h2 className="mb-3 text-base font-black">[해당 작품을 볼 수 있는 곳]</h2>
              {work.platform.length ? (
                <div className="flex flex-wrap gap-2">
                  {work.platform.map((platform) => (
                    <a
                      key={platform}
                      href="#"
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-surface"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] text-white">
                        {platform.slice(0, 1)}
                      </span>
                      {platform}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  감상 플랫폼 정보는 추후 연동 예정입니다.
                </p>
              )}
            </section>

            {/* Recommendations: 상세 내 6개 고정(가로 채움), 무한스크롤 X */}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-black">
                  💡 이 작품 좋아하시면 이것도 좋아하실지 몰라요!
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    user
                      ? router.push(`/ollpick/write?base=${encodeURIComponent(work.id)}`)
                      : requireAuth()
                  }
                  className="rounded-full bg-brand px-4 py-2 text-xs font-black text-white"
                >
                  내 추천 작성하기
                </button>
              </div>

              <div className="mb-4 flex gap-2">
                {(
                  [
                    ["anime", "애니"],
                    ["webtoon", "웹툰"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRecType(id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                      activeRecType === id
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {recommendations.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 md:gap-4">
                  {recommendations.map((item) => (
                    <WorkThumbnail
                      key={item.id}
                      work={item}
                      userId={state.currentUserId}
                      status={userStatuses[item.id]}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted">
                  아직 추천한 작품이 없어요
                </p>
              )}

              <div className="mt-5 text-center">
                <Link
                  href={`/ollpick/${work.id}`}
                  className="text-sm font-bold text-muted hover:text-brand"
                >
                  전체보기 &gt;
                </Link>
              </div>
            </section>

            {/* Series order */}
            <section className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-black">[작품 순서]</h2>
                <div className="flex gap-2">
                  {(
                    [
                      ["air", "방영순"],
                      ["timeline", "세계관 시간 순"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSeriesOrder(id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        seriesOrder === id
                          ? "bg-brand text-white"
                          : "border border-line bg-white text-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-line rounded-xl border border-line">
                {(seriesOrder === "air" ? series : [...series].reverse()).map((item, index) => (
                  <Link
                    key={`${item.id}-${index}`}
                    href={`/works/${item.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-blueSoft"
                  >
                    <span className="font-bold text-ink">{item.title}</span>
                    <span className="shrink-0 text-xs font-bold text-muted">{item.meta}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <h2 className="mb-3 text-base font-black">[작품 평가]</h2>

              <div className="mb-5 rounded-2xl border border-line bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-search text-xs font-black">
                    {(user?.nickname ?? "유").slice(0, 1)}
                  </span>
                  <span className="text-sm font-bold">{user?.nickname ?? "유저 닉네임"}</span>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted">평점</span>
                  <div className="flex gap-0.5 text-xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={!user || Boolean(myReview)}
                        onClick={() => setRating(star)}
                        className={star <= rating ? "text-yellow-400" : "text-slate-300"}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-muted">
                    {(rating || 0).toFixed(1)}
                  </span>
                </div>

                <textarea
                  disabled={!user || Boolean(myReview)}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={
                    user
                      ? myReview
                        ? "이미 이 작품에 평가를 작성했습니다."
                        : "최소 10자 ~ 최대 1,000자"
                      : "평가 작성은 로그인 후 이용 가능합니다."
                  }
                  className="min-h-[120px] w-full resize-none rounded-xl border border-line bg-white p-3 text-sm outline-none disabled:bg-surface"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">한 작품당 평점은 1회만 작성 가능합니다.</p>
                  <button
                    type="button"
                    onClick={() => void submitReview()}
                    disabled={Boolean(myReview)}
                    className="rounded-lg bg-brand px-5 py-2 text-sm font-black text-white disabled:opacity-40"
                  >
                    등록
                  </button>
                </div>
              </div>

              {workReviews.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {workReviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-line bg-white p-4"
                    >
                      <Link href={`/reviews/${review.id}`} className="block">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-sm font-bold">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-search text-[11px]">
                              {review.nickname.slice(0, 1)}
                            </span>
                            {review.nickname}
                          </span>
                          <span className="text-sm font-bold text-yellow-500">
                            ★ {review.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="line-clamp-3 min-h-[60px] text-sm leading-relaxed text-ink/85">
                          {review.content}
                        </p>
                      </Link>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted">
                        <span>
                          {new Date(review.createdAt).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => void onLike(review.id)}
                          className="inline-flex items-center gap-1 font-bold hover:text-brand"
                        >
                          <span>🔥</span>
                          공감 {review.likeCount}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
                  아직 등록된 평가가 없습니다.
                </p>
              )}
            </section>
          </div>

          {/* Sidebar meta */}
          <aside className="h-fit rounded-2xl border border-line bg-[#f3f6fb] p-5 lg:sticky lg:top-24">
            <h2 className="mb-3 text-base font-black">[작품 정보]</h2>
            <div className="divide-y divide-line/80">
              <MetaRow
                label="원제"
                value={work.meta.original || work.title}
              />
              <MetaRow label="콘텐츠 ID" value={work.id} />
              <MetaRow
                label={work.type === "anime" ? "방영상태" : "연재상태"}
                value={work.statusLabel}
              />
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 text-sm">
      <span className="shrink-0 font-bold text-muted">{label}</span>
      <span className="text-right font-bold text-ink">{value}</span>
    </div>
  );
}

function buildSeries(work: Work) {
  const pool = works
    .filter((item) => item.type === work.type)
    .slice(0, 8);

  const currentIndex = Math.max(
    0,
    pool.findIndex((item) => item.id === work.id)
  );

  const ordered = [
    ...pool.slice(currentIndex),
    ...pool.slice(0, currentIndex),
  ].slice(0, 5);

  return ordered.map((item, index) => ({
    id: item.id,
    title: item.title,
    meta:
      work.type === "anime"
        ? index === 1
          ? "극장판"
          : `시즌 ${index + 1} / ${12 + index * 2}화`
        : `${index + 1}부 / ${item.meta.episodes}`,
  }));
}
