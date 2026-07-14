"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import FollowListModal from "@/components/FollowListModal";
import LibraryShelf from "@/components/LibraryShelf";
import WorkCoverImage from "@/components/WorkCoverImage";
import WorkThumbnail from "@/components/WorkThumbnail";
import { showToast } from "@/components/Toast";
import {
  deleteMyPickReason,
  deleteReview,
  fetchProfile,
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  toggleFollow,
  updateBio,
} from "@/lib/store";
import { loadWorkStatuses } from "@/lib/db";
import { buildRatingStatsMap } from "@/lib/ratings";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";
import type { User, Work, WorkStatus } from "@/lib/types";

type Tab = "overview" | "anime" | "webtoon" | "posts";
type PostsSub = "recs" | "reviews";
type FollowModalTab = "followers" | "following";

export default function UserProfilePage({ profileUserId }: { profileUserId?: string }) {
  const router = useRouter();
  const { state, ready, worksRevision } = useAllbluState();
  const [tab, setTab] = useState<Tab>("overview");
  const [postsSub, setPostsSub] = useState<PostsSub>("recs");
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [bioEditing, setBioEditing] = useState(false);
  const [followTick, setFollowTick] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileStatuses, setProfileStatuses] = useState<Record<string, WorkStatus>>({});
  const [profileStatusTimes, setProfileStatusTimes] = useState<Record<string, string>>({});
  const [profileLoading, setProfileLoading] = useState(Boolean(profileUserId));
  const [followModal, setFollowModal] = useState<{
    open: boolean;
    tab: FollowModalTab;
  }>({ open: false, tab: "followers" });

  const sessionUser = state.users.find((item) => item.id === state.currentUserId);
  const targetId = profileUserId ?? state.currentUserId;
  const isOwnProfile = Boolean(
    targetId && state.currentUserId && targetId === state.currentUserId
  );

  // 내 마이페이지: 전역 state의 시청 상태 동기화
  useEffect(() => {
    if (!ready) return;
    const viewingOther =
      Boolean(profileUserId) && profileUserId !== state.currentUserId;
    if (viewingOther) return;

    setProfileUser(sessionUser ?? null);
    setProfileStatuses(sessionUser ? state.workStatuses[sessionUser.id] ?? {} : {});
    setProfileStatusTimes(
      sessionUser ? state.workStatusUpdatedAt?.[sessionUser.id] ?? {} : {}
    );
    setProfileLoading(false);
  }, [
    ready,
    profileUserId,
    sessionUser,
    state.currentUserId,
    state.workStatuses,
    state.workStatusUpdatedAt,
  ]);

  // 타인 마이페이지: 프로필 + 시청 상태를 DB에서 조회 (전역 state에는 본인 보관함만 있음)
  useEffect(() => {
    if (!ready || !profileUserId) return;
    if (profileUserId === state.currentUserId) return;

    let cancelled = false;
    setProfileLoading(true);
    void (async () => {
      try {
        const [profile, statusResult] = await Promise.all([
          fetchProfile(profileUserId),
          loadWorkStatuses(profileUserId),
        ]);
        if (cancelled) return;
        if (!profile) {
          setProfileUser(null);
          setProfileStatuses({});
          setProfileStatusTimes({});
          return;
        }
        setProfileUser(profile);
        setProfileStatuses(statusResult.statuses);
        setProfileStatusTimes(statusResult.times);
      } catch (error) {
        console.error("Failed to load other user profile", error);
        if (!cancelled) {
          setProfileUser(null);
          setProfileStatuses({});
          setProfileStatusTimes({});
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, profileUserId, state.currentUserId]);

  const user = profileUser;
  const statuses = profileStatuses;
  const statusTimes = profileStatusTimes;

  useEffect(() => {
    if (!user) {
      setFollowerCount(0);
      setFollowingCount(0);
      return;
    }
    void (async () => {
      setFollowerCount(await getFollowerCount(user.id));
      setFollowingCount(await getFollowingCount(user.id));
    })();
  }, [user, followTick, ready]);

  const recentAnime = useMemo(
    () => recentWorksByType(statuses, statusTimes, "anime"),
    [statuses, statusTimes, worksRevision]
  );
  const recentWebtoon = useMemo(
    () => recentWorksByType(statuses, statusTimes, "webtoon"),
    [statuses, statusTimes, worksRevision]
  );

  const myReviews = useMemo(() => {
    if (!user) return [];
    return state.reviews
      .filter((review) => review.userId === user.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [state.reviews, user]);

  const ratingStats = useMemo(
    () => buildRatingStatsMap(state.reviews),
    [state.reviews]
  );

  const myRecs = useMemo(() => {
    if (!user) return [];
    return state.picks
      .flatMap((pick) => {
        const mine = pick.reasons.filter((reason) => reason.userId === user.id);
        return mine.map((reason) => ({
          pickId: pick.id,
          reasonId: reason.id,
          baseWorkId: pick.baseWorkId,
          recommendedWorkId: pick.recommendedWorkId,
          content: reason.content,
          createdAt: reason.createdAt,
        }));
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [state.picks, user]);

  const goPosts = (sub: PostsSub) => {
    setPostsSub(sub);
    setTab("posts");
  };

  if (!ready || profileLoading) {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-sm text-muted">불러오는 중…</div>
      </AppShell>
    );
  }

  if (!user) {
    if (profileUserId) {
      return (
        <AppShell>
          <section className="mx-auto max-w-3xl px-6 py-10">
            <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-black">유저를 찾을 수 없습니다</p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-5 rounded-lg bg-navy px-5 py-2 text-sm font-black text-white"
              >
                홈으로
              </button>
            </div>
          </section>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black">로그인 후 마이페이지를 볼 수 있습니다</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="rounded-lg bg-navy px-5 py-2 text-sm font-black text-white"
              >
                회원가입
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded-lg border border-line px-5 py-2 text-sm font-black"
              >
                로그인
              </button>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  const bio = bioDraft ?? user.bio ?? "";
  const badge = user.badge ?? "올블루 스타터";
  const postsTabLabel = isOwnProfile ? "내가 쓴 글" : "작성한 글";

  return (
    <AppShell>
      <div className="min-h-[70vh] bg-[#f5f7fb]">
        {/* 프로필 헤더 — 최상단, 스크롤 시 위로 사라짐 */}
        <section className="border-b border-line bg-white px-6 py-8 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-5">
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-[#e8eef8] text-4xl text-muted">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black tracking-tight">{user.nickname}</h1>
              <span className="mt-2 inline-flex rounded-md bg-[#eef2f8] px-2.5 py-1 text-xs font-bold text-navy">
                {badge}
              </span>
              <button
                type="button"
                onClick={() => setFollowModal({ open: true, tab: "followers" })}
                className="mt-3 block text-left text-sm font-bold text-muted transition hover:text-brand"
              >
                팔로워 {followerCount}명 · 팔로잉 {followingCount}명
              </button>
            </div>
            {/* 타인 프로필일 때만 팔로우 — 본인 페이지에서는 미노출 */}
            {!isOwnProfile ? (
              <FollowButton
                targetUserId={user.id}
                viewerId={state.currentUserId}
                onChange={() => setFollowTick((n) => n + 1)}
              />
            ) : null}
          </div>
        </section>

        <FollowListModal
          open={followModal.open}
          onClose={() => setFollowModal((prev) => ({ ...prev, open: false }))}
          ownerUserId={user.id}
          ownerNickname={user.nickname}
          initialTab={followModal.tab}
          followerCount={followerCount}
          followingCount={followingCount}
        />

        {/* 스티키 탭 */}
        <div className="sticky top-[72px] z-30 border-b border-line bg-[#e8f1ff]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl gap-1 px-4 lg:px-10">
            {(
              [
                ["overview", "개요"],
                ["anime", "애니"],
                ["webtoon", "웹툰"],
                ["posts", postsTabLabel],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative px-4 py-3.5 text-sm font-black transition ${
                  tab === key ? "text-brand" : "text-muted hover:text-ink"
                }`}
              >
                {label}
                {tab === key ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-10">
          {tab === "overview" && (
            <div className="grid gap-5">
              {/* 자기소개란 — 기본 읽기 전용, 수정 클릭 시 편집 */}
              <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-black">자기소개란</h2>
                  {isOwnProfile ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!bioEditing) {
                          setBioDraft(user.bio ?? "");
                          setBioEditing(true);
                          return;
                        }
                        void updateBio(user.id, bio.trim()).then(() => {
                          setBioDraft(null);
                          setBioEditing(false);
                        });
                      }}
                      className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {bioEditing ? "저장" : "수정"}
                    </button>
                  ) : null}
                </div>
                {isOwnProfile ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBioDraft(e.target.value)}
                    rows={3}
                    disabled={!bioEditing}
                    placeholder="공란 가능 / 일단은 글만 작성 가능"
                    className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none ${
                      bioEditing
                        ? "border-brand bg-white focus:border-brand"
                        : "cursor-default border-line bg-[#f8fafc] text-ink"
                    }`}
                  />
                ) : (
                  <p className="min-h-[4.5rem] whitespace-pre-wrap text-sm text-ink">
                    {user.bio?.trim() || (
                      <span className="text-muted">공란 가능 / 일단은 글만 작성 가능</span>
                    )}
                  </p>
                )}
              </section>

              {/* 2×2: 최근 작품 + 내가 쓴 글 (빈 상태 포함) */}
              <div className="grid gap-5 lg:grid-cols-2">
                <RecentWorksPanel
                  title="최근 유저가 추가한 애니"
                  tag="애니"
                  items={recentAnime}
                  statuses={statuses}
                  ratingStats={ratingStats}
                  userId={user.id}
                />
                <RecentWorksPanel
                  title="최근 유저가 추가한 웹툰"
                  tag="웹툰"
                  items={recentWebtoon}
                  statuses={statuses}
                  ratingStats={ratingStats}
                  userId={user.id}
                />
                <OverviewPostsPanel
                  title={isOwnProfile ? "내가 쓴 올블픽 추천글" : "작성한 올블픽 추천글"}
                  emptyText="아직 작성한 올블픽 추천글이 없습니다."
                  isEmpty={!myRecs.length}
                  onOpen={() => goPosts("recs")}
                >
                  {myRecs.slice(0, 3).map((item) => {
                    const recommended = getWork(item.recommendedWorkId);
                    return (
                      <div
                        key={`${item.pickId}-${item.createdAt}`}
                        className="grid grid-cols-[48px_1fr_auto] items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
                      >
                        <ThumbMini work={recommended} />
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-black">
                            {recommended?.title ?? "작품"}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {item.content}
                          </p>
                        </div>
                        <time className="shrink-0 text-[11px] font-bold text-muted">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                    );
                  })}
                </OverviewPostsPanel>
                <OverviewPostsPanel
                  title={isOwnProfile ? "내가 쓴 평가글" : "작성한 평가글"}
                  emptyText="아직 작성한 평가글이 없습니다."
                  isEmpty={!myReviews.length}
                  onOpen={() => goPosts("reviews")}
                >
                  {myReviews.slice(0, 3).map((review) => {
                    const work = getWork(review.workId);
                    return (
                      <div
                        key={review.id}
                        className="grid grid-cols-[48px_1fr] items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
                      >
                        <ThumbMini work={work} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="line-clamp-1 text-sm font-black">
                              {work?.title ?? "작품"}
                            </p>
                            <span className="shrink-0 text-xs font-bold text-amber-500">
                              {"★".repeat(review.rating)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {review.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </OverviewPostsPanel>
              </div>
            </div>
          )}

          {(tab === "anime" || tab === "webtoon") && (
            <LibraryShelf
              type={tab}
              userId={user.id}
              statuses={statuses}
              statusTimes={statusTimes}
            />
          )}

          {tab === "posts" && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="mb-5 flex gap-2">
                {(
                  [
                    ["recs", "올블픽 추천글"],
                    ["reviews", "작품 평가"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPostsSub(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                      postsSub === key
                        ? "bg-navy text-white"
                        : "border border-line bg-white text-ink hover:bg-[#f8fafc]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {postsSub === "recs" && (
                <div className="grid gap-3">
                  {myRecs.map((item) => {
                    const base = getWork(item.baseWorkId);
                    const recommended = getWork(item.recommendedWorkId);
                    return (
                      <div
                        key={`${item.pickId}-${item.reasonId}`}
                        className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-white p-4 transition hover:border-brand/30"
                      >
                        <Link
                          href={`/ollpick/${item.baseWorkId}`}
                          className="flex min-w-0 flex-1 flex-wrap items-start gap-4"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <ThumbMini work={base} size="md" />
                            <span className="text-[10px] font-bold text-muted">감상작</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <ThumbMini work={recommended} size="md" />
                            <span className="text-[10px] font-bold text-muted">추천작</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-relaxed text-ink">
                              {item.content}
                            </p>
                            <time className="mt-2 block text-xs font-bold text-muted">
                              {formatDate(item.createdAt)}
                            </time>
                          </div>
                        </Link>
                        {isOwnProfile ? (
                          <button
                            type="button"
                            aria-label="올블픽 추천글 삭제"
                            onClick={() => {
                              if (!window.confirm("이 올블픽 추천글을 삭제할까요?")) return;
                              void deleteMyPickReason(item.pickId, item.reasonId, user.id).then(
                                () => showToast("올블픽 추천글을 삭제했습니다")
                              );
                            }}
                            className="ml-auto rounded-lg p-2 text-muted hover:bg-[#f1f5f9] hover:text-ink"
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {!myRecs.length && (
                    <p className="py-16 text-center text-sm font-bold text-muted">
                      아직 작성한 올블픽 추천글이 없습니다.
                    </p>
                  )}
                </div>
              )}

              {postsSub === "reviews" && (
                <div className="grid gap-3">
                  {myReviews.map((review) => {
                    const work = getWork(review.workId);
                    return (
                      <div
                        key={review.id}
                        className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-white p-4 transition hover:border-brand/30"
                      >
                        <Link href={`/reviews/${review.id}`} className="shrink-0">
                          <ThumbMini work={work} size="lg" />
                        </Link>
                        <Link
                          href={`/reviews/${review.id}`}
                          className="min-w-0 flex-1"
                        >
                          <p className="font-black tracking-tight">
                            {work?.title ?? "작품"}
                          </p>
                          <p className="mt-1 text-sm font-bold text-amber-500">
                            {"★".repeat(review.rating)}
                            <span className="ml-1 text-muted">
                              {review.rating}/5
                              {` · 평균 ${(ratingStats.get(review.workId)?.average ?? 0).toFixed(1)}`}
                            </span>
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                            {review.content}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
                            <time>{formatDate(review.createdAt)}</time>
                            <span className="inline-flex items-center gap-1">
                              <HeartIcon />
                              {review.likeCount}
                            </span>
                          </div>
                        </Link>
                        {isOwnProfile ? (
                          <div className="ml-auto flex shrink-0 items-center gap-2">
                            <Link
                              href={`/reviews/${review.id}/edit`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-black text-white"
                            >
                              <PencilIcon />
                              수정
                            </Link>
                            <button
                              type="button"
                              aria-label="평가글 삭제"
                              onClick={() => {
                                if (!window.confirm("이 평가글을 삭제할까요?")) return;
                                void deleteReview(review.id, user.id).then(() =>
                                  showToast("평가글을 삭제했습니다")
                                );
                              }}
                              className="rounded-lg p-2 text-muted hover:bg-[#f1f5f9] hover:text-ink"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!myReviews.length && (
                    <p className="py-16 text-center text-sm font-bold text-muted">
                      아직 작성한 평가글이 없습니다.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function recentWorksByType(
  statuses: Record<string, WorkStatus>,
  times: Record<string, string>,
  type: "anime" | "webtoon"
) {
  return works
    .filter((work) => work.type === type && statuses[work.id])
    .sort((a, b) => {
      const ta = times[a.id] ?? "";
      const tb = times[b.id] ?? "";
      return tb.localeCompare(ta);
    })
    .slice(0, 10);
}

function RecentWorksPanel({
  title,
  tag,
  items,
  statuses,
  ratingStats,
  userId,
}: {
  title: string;
  tag: string;
  items: Work[];
  statuses: Record<string, WorkStatus>;
  ratingStats: Map<string, import("@/lib/ratings").WorkRatingStats>;
  userId: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-black">{title}</h2>
      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {items.map((work) => (
            <WorkThumbnail
              key={work.id}
              work={work}
              userId={userId}
              status={statuses[work.id]}
              averageRating={ratingStats.get(work.id)?.average ?? 0}
              compact
              showMeta
            />
          ))}
        </div>
      ) : (
        <div className="relative flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-line bg-[#f8fafc] px-4">
          <span className="absolute left-3 top-3 rounded bg-navy px-2 py-0.5 text-[11px] font-black text-white">
            {tag}
          </span>
          <p className="text-sm font-bold text-muted">아직 추가하신게 없어요</p>
        </div>
      )}
    </section>
  );
}

function OverviewPostsPanel({
  title,
  emptyText,
  isEmpty,
  onOpen,
  children,
}: {
  title: string;
  emptyText: string;
  isEmpty: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full flex-col items-stretch justify-start rounded-2xl border border-line bg-white p-5 text-left shadow-sm transition hover:border-brand/40"
    >
      <h2 className="mb-4 text-base font-black">{title}</h2>
      {isEmpty ? (
        <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-xl border border-dashed border-line bg-[#f8fafc] px-4">
          <p className="text-sm font-bold text-muted">{emptyText}</p>
        </div>
      ) : (
        <div className="grid w-full gap-3 self-start">{children}</div>
      )}
    </button>
  );
}

function ThumbMini({
  work,
  size = "sm",
}: {
  work?: Work;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-[96px] w-[72px]"
      : size === "md"
        ? "h-[72px] w-[52px]"
        : "h-12 w-9";
  return (
    <div className={`${dim} relative shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]`}>
      <WorkCoverImage
        src={work?.thumbnailUrl}
        alt={work?.title ?? ""}
      />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12ZM10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L16.62 5.5a1.5 1.5 0 0 0-2.12 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.35-7-9.2A3.8 3.8 0 0 1 12 7.5a3.8 3.8 0 0 1 7 3.3C19 15.65 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FollowButton({
  targetUserId,
  viewerId,
  onChange,
}: {
  targetUserId: string;
  viewerId?: string;
  onChange: () => void;
}) {
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    void isFollowing(targetUserId, viewerId).then(setFollowing);
  }, [targetUserId, viewerId]);
  return (
    <button
      type="button"
      onClick={() => {
        if (!viewerId) {
          showToast("로그인이 필요한 기능입니다");
          return;
        }
        void toggleFollow(targetUserId, viewerId).then((next) => {
          setFollowing(next);
          onChange();
        });
      }}
      className={`mt-1 shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
        following
          ? "border border-brand bg-white text-brand"
          : "bg-brand text-white"
      }`}
    >
      {following ? "✓ 팔로잉" : "+ 팔로우"}
    </button>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ko-KR");
  } catch {
    return iso.slice(0, 10);
  }
}
