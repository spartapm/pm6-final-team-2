"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import BadgeCollection from "@/components/BadgeCollection";
import FollowListModal from "@/components/FollowListModal";
import LibraryShelf, {
  type LibraryStatusFilter,
} from "@/components/LibraryShelf";
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
  updateBadge,
  updateBio,
  updateReview,
} from "@/lib/store";
import { loadWorkStatuses } from "@/lib/db";
import { buildRatingStatsMap } from "@/lib/ratings";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";
import type { User, Work, WorkStatus } from "@/lib/types";

type Tab = "overview" | "anime" | "webtoon" | "posts" | "badges";
type PostsSub = "recs" | "reviews";
type FollowModalTab = "followers" | "following";

function formatTabCount(count: number) {
  if (count > 999) return "999+";
  return String(count);
}

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
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editContent, setEditContent] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [overviewStatus, setOverviewStatus] = useState<WorkStatus | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatusFilter>("ALL");

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
    () => recentWorksByType(statuses, statusTimes, "anime", overviewStatus),
    [statuses, statusTimes, worksRevision, overviewStatus]
  );
  const recentWebtoon = useMemo(
    () => recentWorksByType(statuses, statusTimes, "webtoon", overviewStatus),
    [statuses, statusTimes, worksRevision, overviewStatus]
  );

  const libraryCounts = useMemo(() => {
    const anime = works.filter((work) => work.type === "anime" && statuses[work.id]).length;
    const webtoon = works.filter((work) => work.type === "webtoon" && statuses[work.id]).length;
    return { anime, webtoon };
  }, [statuses, worksRevision]);

  const overviewStatusCounts = useMemo(() => {
    const counts: Record<WorkStatus, number> = {
      KEEP: 0,
      WATCHING: 0,
      DONE: 0,
      STOPPED: 0,
    };
    for (const status of Object.values(statuses)) {
      if (status in counts) counts[status] += 1;
    }
    return counts;
  }, [statuses]);

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

  const goLibrary = (type: "anime" | "webtoon", status: LibraryStatusFilter = "ALL") => {
    setLibraryStatus(status);
    setTab(type);
  };

  const syncRepresentativeBadge = useCallback(
    (badgeLabel: string) => {
      if (!isOwnProfile || !user) return;
      if ((user.badge ?? "올블루 스타터") === badgeLabel) return;
      void updateBadge(user.id, badgeLabel);
    },
    [isOwnProfile, user]
  );

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
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-blueSoft text-3xl font-black text-brand">
              {(user.nickname || "유").slice(0, 1)}
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
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 lg:px-10">
            {(
              [
                { key: "overview" as const, label: "개요" },
                {
                  key: "anime" as const,
                  label: "애니",
                  count: libraryCounts.anime,
                },
                {
                  key: "webtoon" as const,
                  label: "웹툰",
                  count: libraryCounts.webtoon,
                },
                {
                  key: "posts" as const,
                  label: postsTabLabel,
                  count: myRecs.length + myReviews.length,
                },
                { key: "badges" as const, label: "배지" },
              ] as const
            ).map((item) => {
              const active = tab === item.key;
              const count =
                "count" in item && typeof item.count === "number"
                  ? item.count
                  : null;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === "anime" || item.key === "webtoon") {
                      setLibraryStatus("ALL");
                    }
                    setTab(item.key);
                  }}
                  className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3.5 text-sm font-black transition ${
                    active ? "text-brand" : "text-muted hover:text-ink"
                  }`}
                >
                  <span>{item.label}</span>
                  {count != null ? (
                    <span
                      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                        active
                          ? "bg-brand text-white"
                          : "bg-[#c5d4ef] text-navy"
                      }`}
                    >
                      {formatTabCount(count)}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />
                  ) : null}
                </button>
              );
            })}
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

              {/* 상태별 요약 필터 */}
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["WATCHING", "보는 중"],
                    ["DONE", "완료"],
                    ["KEEP", "볼 예정"],
                    ["STOPPED", "중단"],
                  ] as const
                ).map(([code, label]) => {
                  const active = overviewStatus === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() =>
                        setOverviewStatus((prev) => (prev === code ? null : code))
                      }
                      className={`rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                        active
                          ? "bg-brand text-white"
                          : "border border-line bg-white text-ink hover:border-brand/40"
                      }`}
                    >
                      {label} {overviewStatusCounts[code]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => goPosts("recs")}
                  className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-bold text-ink hover:border-brand/40"
                >
                  올블픽 {myRecs.length}
                </button>
                <button
                  type="button"
                  onClick={() => goPosts("reviews")}
                  className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-bold text-ink hover:border-brand/40"
                >
                  평가 {myReviews.length}
                </button>
              </div>

              {/* 최근 작품 */}
              <div className="grid gap-5 lg:grid-cols-2">
                <RecentWorksPanel
                  title="최근 추가한 애니"
                  tag="애니"
                  items={recentAnime}
                  statuses={statuses}
                  ratingStats={ratingStats}
                  userId={user.id}
                  onViewAll={() =>
                    goLibrary("anime", overviewStatus ?? "ALL")
                  }
                />
                <RecentWorksPanel
                  title="최근 추가한 웹툰"
                  tag="웹툰"
                  items={recentWebtoon}
                  statuses={statuses}
                  ratingStats={ratingStats}
                  userId={user.id}
                  onViewAll={() =>
                    goLibrary("webtoon", overviewStatus ?? "ALL")
                  }
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
              key={`${tab}-${libraryStatus}`}
              type={tab}
              userId={user.id}
              statuses={statuses}
              statusTimes={statusTimes}
              initialStatus={libraryStatus}
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
                            <span className="text-[10px] font-bold text-muted">좋아한 작품</span>
                          </div>
                          <span className="pt-6 text-sm font-bold text-muted" aria-hidden>
                            →
                          </span>
                          <div className="flex flex-col items-center gap-1">
                            <ThumbMini work={recommended} size="md" />
                            <span className="text-[10px] font-bold text-muted">닮은 작품</span>
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
                    const isEditing = editingReviewId === review.id;

                    if (isEditing) {
                      return (
                        <div
                          key={review.id}
                          className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-white p-4"
                        >
                          <div className="shrink-0">
                            <ThumbMini work={work} size="lg" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black tracking-tight">
                              {work?.title ?? "작품"}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex gap-0.5 text-xl">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEditRating(star)}
                                    className={
                                      star <= editRating
                                        ? "text-yellow-400"
                                        : "text-slate-300"
                                    }
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                              <span className="text-sm font-bold text-muted">
                                {editRating.toFixed(1)}
                              </span>
                            </div>
                            <textarea
                              value={editContent}
                              maxLength={1000}
                              onChange={(event) =>
                                setEditContent(event.target.value.slice(0, 1000))
                              }
                              placeholder="이 작품에 대한 생각을 10자 이상 남겨주세요."
                              className="mt-3 min-h-[140px] w-full resize-none rounded-xl border border-line bg-white p-3 text-sm outline-none"
                            />
                            <div className="mt-2 flex flex-col items-end gap-2">
                              <p className="text-xs text-muted">
                                {editContent.length}/1000
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={savingReview}
                                  onClick={() => {
                                    setEditingReviewId(null);
                                    setEditContent("");
                                  }}
                                  className="rounded-full border border-line bg-white px-4 py-1.5 text-xs font-black text-ink"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  disabled={savingReview}
                                  onClick={() => {
                                    if (
                                      editContent.trim().length < 10 ||
                                      editContent.length > 1000
                                    ) {
                                      alert(
                                        "글자수는 10자에서 1000자 사이로 입력해주세요."
                                      );
                                      return;
                                    }
                                    setSavingReview(true);
                                    void updateReview(review.id, user.id, {
                                      rating: editRating,
                                      content: editContent.trim(),
                                    })
                                      .then((result) => {
                                        if (!result.ok) {
                                          alert(result.message);
                                          return;
                                        }
                                        setEditingReviewId(null);
                                        setEditContent("");
                                        showToast("평가글을 수정했습니다");
                                      })
                                      .finally(() => setSavingReview(false));
                                  }}
                                  className="rounded-full bg-brand px-4 py-1.5 text-xs font-black text-white disabled:opacity-40"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

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
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReviewId(review.id);
                                setEditRating(review.rating);
                                setEditContent(review.content);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-black text-white"
                            >
                              <PencilIcon />
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  !window.confirm("이 작품 평가를 삭제할까요?")
                                ) {
                                  return;
                                }
                                void deleteReview(review.id, user.id).then(() =>
                                  showToast("평가글을 삭제했습니다")
                                );
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-black text-ink hover:border-red-200 hover:text-red-500"
                            >
                              삭제
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

          {tab === "badges" && (
            <BadgeCollection
              statuses={statuses}
              pickCount={myRecs.length}
              reviewCount={myReviews.length}
              isOwnProfile={isOwnProfile}
              onRepresentativeChange={syncRepresentativeBadge}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function recentWorksByType(
  statuses: Record<string, WorkStatus>,
  times: Record<string, string>,
  type: "anime" | "webtoon",
  statusFilter: WorkStatus | null = null
) {
  return works
    .filter(
      (work) =>
        work.type === type &&
        statuses[work.id] &&
        (!statusFilter || statuses[work.id] === statusFilter)
    )
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
  onViewAll,
}: {
  title: string;
  tag: string;
  items: Work[];
  statuses: Record<string, WorkStatus>;
  ratingStats: Map<string, import("@/lib/ratings").WorkRatingStats>;
  userId: string;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black">{title}</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-bold text-brand hover:bg-blueSoft"
        >
          전체 보기
        </button>
      </div>
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
