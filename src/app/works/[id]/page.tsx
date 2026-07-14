"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showLoginRequired, showToast } from "@/components/Toast";
import {
  addReview,
  hasLikedReview,
  likeReview,
  setWorkStatus,
} from "@/lib/store";
import {
  mapWorkStatus,
  trackArchiveStatusSave,
  trackOllpickRecommendClick,
  trackPlatformLinkClick,
} from "@/lib/analytics";
import { useAllbluState } from "@/lib/useAllbluState";
import { ratingStatsForWork, buildRatingStatsMap } from "@/lib/ratings";
import { getWork, statusIconSrc } from "@/lib/works";
import type { Ollpick, Work, WorkStatus, WorkType } from "@/lib/types";

/** 상세 시청상태: 활성 재클릭 시 해제(토글). 활성=brand / 비활성=흰 테두리 */
const STATUS_BUTTONS: { code: WorkStatus; label: string }[] = [
  { code: "WATCHING", label: "보는중" },
  { code: "DONE", label: "완료" },
  { code: "KEEP", label: "볼 예정" },
  { code: "STOPPED", label: "중단" },
];

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, worksRevision } = useAllbluState();
  const work = useMemo(() => getWork(params.id), [params.id, worksRevision]);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [recType, setRecType] = useState<WorkType | null>(null);
  const [seriesOrder, setSeriesOrder] = useState<"air" | "timeline">("air");

  const user = state.users.find((item) => item.id === state.currentUserId);
  const userStatuses = user ? state.workStatuses[user.id] ?? {} : {};
  const userStatus = user ? userStatuses[params.id] : undefined;
  const workId = work?.id ?? params.id;
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
    if (!workId) return [] as { work: Work; pick: Ollpick }[];
    return state.picks
      .filter((pick) => pick.baseWorkId === workId)
      .map((pick) => {
        const recommended = getWork(pick.recommendedWorkId);
        return recommended && recommended.type === activeRecType
          ? { work: recommended, pick }
          : null;
      })
      .filter((item): item is { work: Work; pick: Ollpick } => item != null)
      .slice(0, 6);
  }, [activeRecType, state.picks, workId, worksRevision]);

  const { average: ratingAverage, count: ratingCount } = useMemo(
    () => ratingStatsForWork(state.reviews, workId),
    [state.reviews, workId]
  );
  const ratingValue = ratingAverage;
  const ratingStats = useMemo(
    () => buildRatingStatsMap(state.reviews),
    [state.reviews]
  );

  if (!work) notFound();

  const requireAuth = (feature: "status_save" | "evaluation_write" | "empathy" | "recommend_write") => {
    showLoginRequired(feature);
  };

  const onStatusClick = (code: WorkStatus) => {
    if (!user) {
      requireAuth("status_save");
      return;
    }
    const prev = mapWorkStatus(userStatus);
    const clearing = userStatus === code;
    const nextStatus = clearing ? undefined : code;
    const statusValue = clearing
      ? ("cancel" as const)
      : (mapWorkStatus(code) as Exclude<ReturnType<typeof mapWorkStatus>, "none">);

    void (async () => {
      try {
        await setWorkStatus(user.id, work.id, nextStatus);
        trackArchiveStatusSave({
          workId: work.id,
          statusValue,
          prevStatus: prev,
          saveSurface: "work_detail",
        });
      } catch {
        showToast("상태 저장에 실패했습니다");
      }
    })();
  };

  const submitReview = async () => {
    if (!user) {
      requireAuth("evaluation_write");
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
      requireAuth("empathy");
      return;
    }
    if (await hasLikedReview(reviewId, user.id)) return;
    await likeReview(reviewId, user.id);
  };

  const overview =
    work.overview.length > 90 && !overviewOpen
      ? `${work.overview.slice(0, 90)}…`
      : work.overview;

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
              averageRating={ratingAverage}
              showMeta={false}
            />
          </div>

          <div className="min-w-0 pt-1">
            <h1 className="text-[28px] font-black tracking-tight md:text-[34px]">{work.title}</h1>
            <p className="mt-2 text-sm font-bold text-muted">
              {work.type === "anime" ? "애니" : "웹툰"} · {work.statusLabel}
              {work.ageRating ? ` · ${work.ageRating}` : ""}
              {work.serialDays?.length ? ` · ${work.serialDays.join("/")}` : ""}
              {work.genres.length ? ` · ${work.genres.join("/")}` : ""}
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black leading-none">
                {ratingAverage.toFixed(1)}
              </span>
              <div>
                <div
                  className={`flex gap-0.5 text-xl ${
                    ratingCount > 0 ? "text-yellow-400" : "text-slate-300"
                  }`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        ratingCount > 0 && star <= Math.round(ratingValue) ? "" : "text-slate-300"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs font-bold text-muted">
                  {ratingCount.toLocaleString()}명 평가
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={statusIconSrc(button.code, active ? "white" : "brand")}
                        alt=""
                        className="h-4 w-4 object-contain"
                        draggable={false}
                      />
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
              {(work.platforms?.length ?? work.platform.length) ? (
                <div className="flex flex-wrap gap-2">
                  {(
                    work.platforms?.length
                      ? work.platforms
                      : work.platform.map((name) => ({ name, url: undefined }))
                  ).map((platform) => {
                    const label = platform.name;
                    const href = platform.url;
                    const className =
                      "inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-surface";
                    const inner = (
                      <>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] text-white">
                          {label.slice(0, 1)}
                        </span>
                        {label}
                      </>
                    );
                    return href ? (
                      <a
                        key={`${label}-${href}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                        onClick={() =>
                          trackPlatformLinkClick({
                            workId: work.id,
                            platformName: label,
                          })
                        }
                      >
                        {inner}
                      </a>
                    ) : (
                      <span key={label} className={className}>
                        {inner}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">등록된 시청 URL이 없습니다.</p>
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
                      : requireAuth("recommend_write")
                  }
                  className="rounded-full bg-brand px-4 py-2 text-xs font-black text-white"
                >
                  작품 추천하기
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
                  {recommendations.map(({ work: item, pick }) => (
                    <WorkThumbnail
                      key={item.id}
                      work={item}
                      userId={state.currentUserId}
                      status={userStatuses[item.id]}
                      averageRating={ratingStats.get(item.id)?.average ?? 0}
                      compact
                      onWorkOpen={() =>
                        trackOllpickRecommendClick({
                          recommendId: pick.id,
                          baseWorkId: pick.baseWorkId,
                          recommendedWorkId: pick.recommendedWorkId,
                          surface: "work_detail_section",
                          clickTarget: "recommended_work",
                          agreeCount: pick.agreeUserIds.length,
                          setAttribution: true,
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-10 text-center text-sm font-bold leading-7 text-muted">
                  <p>아직 첫 추천을 기다리고 있어요</p>
                  <p>이 작품과 어울리는 작품을 알고 있다면,</p>
                  <p>첫 추천의 주인공이 되어보세요</p>
                </div>
              )}

              <div className="mt-5">
                <Link
                  href={`/ollpick/${work.id}`}
                  className="block rounded-xl bg-[#eef0ff] py-2.5 text-center text-sm font-bold text-brand transition hover:bg-[#e4e7ff]"
                >
                  이 작품의 올블픽 더보기
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
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-line">
                <p className="text-lg font-bold text-muted">준비중입니다</p>
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
              <MetaRow
                label={work.type === "anime" ? "방영상태" : "연재상태"}
                value={work.statusLabel}
              />
              {work.ageRating ? (
                <MetaRow label="이용등급" value={work.ageRating} />
              ) : null}
              {work.meta.episodes ? (
                <MetaRow label="화수" value={work.meta.episodes} />
              ) : null}
              {work.meta.period ? (
                <MetaRow label="기간" value={work.meta.period} />
              ) : null}
              {work.serialDays?.length ? (
                <MetaRow label="연재요일" value={work.serialDays.join(", ")} />
              ) : null}
              {(work.meta.studios?.length || work.meta.studio) ? (
                <MetaRow
                  label="제작사"
                  value={(work.meta.studios ?? [work.meta.studio!]).join(", ")}
                />
              ) : null}
              {(work.meta.directors?.length || work.meta.director) ? (
                <MetaRow
                  label="감독"
                  value={(work.meta.directors ?? [work.meta.director!]).join(", ")}
                />
              ) : null}
              {(work.meta.writers?.length || work.meta.writer) ? (
                <MetaRow
                  label="글"
                  value={(work.meta.writers ?? [work.meta.writer!]).join(", ")}
                />
              ) : null}
              {(work.meta.illustrators?.length || work.meta.illustrator) ? (
                <MetaRow
                  label="그림"
                  value={
                    (work.meta.illustrators ?? [work.meta.illustrator!]).join(", ")
                  }
                />
              ) : null}
              {work.genres.length ? (
                <MetaRow label="장르" value={work.genres.join(", ")} />
              ) : null}
              {work.tags?.length ? (
                <MetaRow
                  label="태그"
                  value={work.tags.slice(0, 8).join(", ")}
                />
              ) : null}
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
