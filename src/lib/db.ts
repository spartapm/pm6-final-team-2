"use client";

import { supabase, supabaseConfigured } from "./supabase";
import type { Ollpick, PickReason, Review, User, WorkStatus } from "./types";

const ELIGIBLE: WorkStatus[] = ["WATCHING", "DONE"];

async function nicknameMap(userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, nickname")
    .in("user_id", unique);
  return new Map((data ?? []).map((row) => [row.user_id as string, row.nickname as string]));
}

export async function loadWorkStatuses(userId: string) {
  const statuses: Record<string, WorkStatus> = {};
  const times: Record<string, string> = {};

  const applyRows = (
    rows: { work_id: string; status: string; updated_at?: string | null }[] | null | undefined
  ) => {
    for (const row of rows ?? []) {
      statuses[row.work_id] = row.status as WorkStatus;
      if (row.updated_at) times[row.work_id] = row.updated_at;
    }
  };

  // 1) 직접 SELECT (공개 SELECT 정책이면 타인 보관함도 조회됨)
  const { data, error } = await supabase
    .from("work_statuses")
    .select("work_id, status, updated_at")
    .eq("user_id", userId);

  if (error) {
    console.error("loadWorkStatuses select failed", error);
  } else if (data?.length) {
    applyRows(data as { work_id: string; status: string; updated_at?: string | null }[]);
    return { statuses, times };
  }

  // 2) SELECT가 비었거나 실패한 경우 RPC(SECURITY DEFINER)로 재시도
  //    own-only RLS면 SELECT가 에러 없이 []를 반환하므로 RPC가 필요함
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_user_work_statuses",
    { p_user_id: userId }
  );

  if (rpcError) {
    // RPC 미배포 환경에서는 경고만 — SELECT 결과(빈 객체 가능)를 그대로 반환
    if (rpcError.code !== "PGRST202") {
      console.error("get_user_work_statuses RPC failed", rpcError);
    }
    return { statuses, times };
  }

  applyRows(rpcData as { work_id: string; status: string; updated_at?: string | null }[]);
  return { statuses, times };
}

export async function setWorkStatus(
  userId: string,
  workId: string,
  status?: WorkStatus
) {
  if (!supabaseConfigured) return;
  if (status) {
    const { error } = await supabase.from("work_statuses").upsert(
      {
        user_id: userId,
        work_id: workId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,work_id" }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("work_statuses")
      .delete()
      .eq("user_id", userId)
      .eq("work_id", workId);
    if (error) throw error;
  }
  window.dispatchEvent(new Event("allblu-state-change"));
}

export async function toggleWorkStatus(
  userId: string,
  workId: string,
  status: WorkStatus
) {
  const { data } = await supabase
    .from("work_statuses")
    .select("status")
    .eq("user_id", userId)
    .eq("work_id", workId)
    .maybeSingle();
  const current = data?.status as WorkStatus | undefined;
  await setWorkStatus(userId, workId, current === status ? undefined : status);
}

export async function loadReviews(limit = 200): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, work_id, user_id, rating, content, like_count, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const names = await nicknameMap(rows.map((r) => r.user_id as string));
  return rows.map((row) => ({
    id: row.id as string,
    workId: row.work_id as string,
    userId: row.user_id as string,
    nickname: names.get(row.user_id as string) ?? "유저",
    rating: row.rating as number,
    content: row.content as string,
    likeCount: row.like_count as number,
    createdAt: row.created_at as string,
  }));
}

export async function addReview(input: {
  workId: string;
  userId: string;
  nickname: string;
  rating: number;
  content: string;
}) {
  const content = input.content.trim();
  if (input.rating < 1 || input.rating > 5) {
    return { ok: false as const, message: "별점을 선택해주세요." };
  }
  if (content.length < 10 || content.length > 1000) {
    return { ok: false as const, message: "평가글은 10자~1000자로 작성해주세요." };
  }
  const { error } = await supabase.from("reviews").insert({
    work_id: input.workId,
    user_id: input.userId,
    rating: input.rating,
    content,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, message: "이미 이 작품에 평가를 작성했습니다." };
    }
    return { ok: false as const, message: error.message };
  }
  window.dispatchEvent(new Event("allblu-state-change"));
  return { ok: true as const };
}

export async function updateReview(
  reviewId: string,
  userId: string,
  patch: { rating: number; content: string }
) {
  const content = patch.content.trim();
  if (patch.rating < 1 || patch.rating > 5) {
    return { ok: false as const, message: "별점을 선택해주세요." };
  }
  if (content.length < 10 || content.length > 1000) {
    return { ok: false as const, message: "평가글은 10자~1000자로 작성해주세요." };
  }
  const { error } = await supabase
    .from("reviews")
    .update({ rating: patch.rating, content })
    .eq("id", reviewId)
    .eq("user_id", userId);
  if (error) return { ok: false as const, message: error.message };
  window.dispatchEvent(new Event("allblu-state-change"));
  return { ok: true as const };
}

export async function deleteReview(reviewId: string, userId: string) {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", userId);
  if (error) throw error;
  window.dispatchEvent(new Event("allblu-state-change"));
}

export async function likeReview(reviewId: string, userId: string) {
  const { data: existing } = await supabase
    .from("review_likes")
    .select("review_id")
    .eq("user_id", userId)
    .eq("review_id", reviewId)
    .maybeSingle();
  if (existing) return;

  const { error: likeError } = await supabase.from("review_likes").insert({
    user_id: userId,
    review_id: reviewId,
  });
  if (likeError) throw likeError;

  const { data: review } = await supabase
    .from("reviews")
    .select("like_count")
    .eq("id", reviewId)
    .maybeSingle();
  await supabase
    .from("reviews")
    .update({ like_count: ((review?.like_count as number) ?? 0) + 1 })
    .eq("id", reviewId);

  window.dispatchEvent(new Event("allblu-state-change"));
}

export async function hasLikedReview(reviewId: string, userId?: string) {
  if (!userId) return false;
  const { data } = await supabase
    .from("review_likes")
    .select("review_id")
    .eq("user_id", userId)
    .eq("review_id", reviewId)
    .maybeSingle();
  return Boolean(data);
}

export async function loadPicks(limit = 200): Promise<Ollpick[]> {
  const { data: picks, error } = await supabase
    .from("ollpicks")
    .select("id, base_work_id, recommended_work_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const pickRows = picks ?? [];
  if (!pickRows.length) return [];

  const pickIds = pickRows.map((p) => p.id as string);
  const { data: reasons } = await supabase
    .from("ollpick_reasons")
    .select("id, pick_id, user_id, content, created_at")
    .in("pick_id", pickIds)
    .order("created_at", { ascending: false });

  const reasonRows = reasons ?? [];
  const names = await nicknameMap(reasonRows.map((r) => r.user_id as string));

  const byPick = new Map<string, PickReason[]>();
  for (const row of reasonRows) {
    const list = byPick.get(row.pick_id as string) ?? [];
    list.push({
      id: row.id as string,
      userId: row.user_id as string,
      nickname: names.get(row.user_id as string) ?? "유저",
      content: row.content as string,
      createdAt: row.created_at as string,
    });
    byPick.set(row.pick_id as string, list);
  }

  // 추천 이유가 없는 고아 픽은 피드/카드에 노출하지 않음
  return pickRows
    .map((pick) => {
      const pickReasons = byPick.get(pick.id as string) ?? [];
      return {
        id: pick.id as string,
        baseWorkId: pick.base_work_id as string,
        recommendedWorkId: pick.recommended_work_id as string,
        firstRecommender: pickReasons[pickReasons.length - 1]?.nickname ?? "유저",
        firstRecommenderUserId: pickReasons[pickReasons.length - 1]?.userId,
        agreeUserIds: pickReasons.map((r) => r.userId),
        reasons: pickReasons,
        createdAt: pick.created_at as string,
      };
    })
    .filter((pick) => pick.reasons.length > 0);
}

async function assertEligible(userId: string, workIds: string[]) {
  const { data } = await supabase
    .from("work_statuses")
    .select("work_id, status")
    .eq("user_id", userId)
    .in("work_id", workIds);
  const map = new Map(
    (data ?? []).map((row) => [row.work_id as string, row.status as WorkStatus])
  );
  return workIds.every((id) => ELIGIBLE.includes(map.get(id) as WorkStatus));
}

export async function addPick(input: {
  baseWorkId: string;
  recommendedWorkId: string;
  reason: string;
  userId: string;
  nickname: string;
}) {
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 200) {
    return { ok: false as const, message: "추천 이유는 10~200자로 작성해주세요." };
  }
  const eligible = await assertEligible(input.userId, [
    input.baseWorkId,
    input.recommendedWorkId,
  ]);
  if (!eligible) {
    return {
      ok: false as const,
      message: "기준작·추천작 모두 보는중/완료로 등록해야 합니다.",
    };
  }

  let pickId: string | undefined;
  const { data: existing } = await supabase
    .from("ollpicks")
    .select("id")
    .eq("base_work_id", input.baseWorkId)
    .eq("recommended_work_id", input.recommendedWorkId)
    .maybeSingle();

  if (existing) {
    pickId = existing.id as string;
    const { data: existingReason } = await supabase
      .from("ollpick_reasons")
      .select("id")
      .eq("pick_id", pickId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (existingReason) {
      return {
        ok: false as const,
        code: "duplicate_pair" as const,
        message: "이미 같은 조합으로 작성하셨어요.",
      };
    }
  } else {
    const { data: created, error } = await supabase
      .from("ollpicks")
      .insert({
        base_work_id: input.baseWorkId,
        recommended_work_id: input.recommendedWorkId,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, message: error.message };
    pickId = created.id as string;
  }

  const isDuplicatePair = Boolean(existing);

  const { error: reasonError } = await supabase.from("ollpick_reasons").insert({
    pick_id: pickId,
    user_id: input.userId,
    content: reason,
    created_at: new Date().toISOString(),
  });
  if (reasonError) {
    if (reasonError.code === "23505") {
      return {
        ok: false as const,
        code: "duplicate_pair" as const,
        message: "이미 같은 조합으로 작성하셨어요.",
      };
    }
    return { ok: false as const, message: reasonError.message };
  }

  window.dispatchEvent(new Event("allblu-state-change"));
  return { ok: true as const, pickId, isDuplicatePair };
}

export async function agreePick(
  pickId: string,
  reason: string,
  userId: string
) {
  const content = reason.trim();
  if (content.length < 10 || content.length > 200) {
    return { ok: false as const, message: "추천 이유는 10~200자로 작성해주세요." };
  }

  const { data: pick } = await supabase
    .from("ollpicks")
    .select("base_work_id, recommended_work_id")
    .eq("id", pickId)
    .maybeSingle();
  if (!pick) return { ok: false as const, message: "추천을 찾을 수 없습니다." };

  const eligible = await assertEligible(userId, [
    pick.base_work_id as string,
    pick.recommended_work_id as string,
  ]);
  if (!eligible) {
    return {
      ok: false as const,
      message: "본 작품(보는중/완료) 등록 후 동의할 수 있습니다.",
    };
  }

  const { error } = await supabase.from("ollpick_reasons").insert({
    pick_id: pickId,
    user_id: userId,
    content,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, message: "이미 동의한 추천입니다." };
    }
    return { ok: false as const, message: error.message };
  }
  window.dispatchEvent(new Event("allblu-state-change"));
  return { ok: true as const };
}

export async function deleteMyPickReason(
  pickId: string,
  reasonId: string,
  userId: string
) {
  // SECURITY DEFINER RPC: 추천글 삭제 + 남은 이유가 없으면 ollpick 행도 삭제
  const { error: rpcError } = await supabase.rpc("delete_my_ollpick_reason", {
    p_pick_id: pickId,
    p_reason_id: reasonId,
  });

  if (rpcError) {
    // RPC 미배포 환경 폴백
    if (rpcError.code !== "PGRST202") throw rpcError;

    const { error } = await supabase
      .from("ollpick_reasons")
      .delete()
      .eq("id", reasonId)
      .eq("pick_id", pickId)
      .eq("user_id", userId);
    if (error) throw error;

    const { count } = await supabase
      .from("ollpick_reasons")
      .select("id", { count: "exact", head: true })
      .eq("pick_id", pickId);
    if ((count ?? 0) === 0) {
      const { error: pickError } = await supabase
        .from("ollpicks")
        .delete()
        .eq("id", pickId);
      if (pickError) {
        console.error("Failed to delete orphan ollpick (need RLS/RPC)", pickError);
      }
    }
  }

  window.dispatchEvent(new Event("allblu-state-change"));
}

export async function updateBio(userId: string, bio: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ bio: bio.trim() })
    .eq("user_id", userId);
  if (error) throw error;
  window.dispatchEvent(new Event("allblu-state-change"));
}

export async function toggleFollow(targetUserId: string, userId: string) {
  const { data: existing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetUserId);
    window.dispatchEvent(new Event("allblu-state-change"));
    return false;
  }

  await supabase.from("follows").insert({
    follower_id: userId,
    following_id: targetUserId,
  });
  window.dispatchEvent(new Event("allblu-state-change"));
  return true;
}

export async function isFollowing(targetUserId: string, userId?: string) {
  if (!userId) return false;
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle();
  return Boolean(data);
}

export async function getFollowingCount(userId?: string) {
  if (!userId) return 0;
  const { count } = await supabase
    .from("follows")
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

export async function getFollowerCount(userId?: string) {
  if (!userId) return 0;
  const { count } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export type FollowListUser = {
  id: string;
  nickname: string;
  badge: string;
};

/** 나를 팔로우하는 유저 목록 */
export async function listFollowers(userId: string): Promise<FollowListUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.follower_id as string);
  return loadFollowProfiles(ids);
}

/** 내가 팔로우하는 유저 목록 */
export async function listFollowing(userId: string): Promise<FollowListUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.following_id as string);
  return loadFollowProfiles(ids);
}

async function loadFollowProfiles(userIds: string[]): Promise<FollowListUser[]> {
  if (!userIds.length) return [];
  const { data } = await supabase
    .from("profiles")
    .select("user_id, nickname, badge")
    .in("user_id", userIds);
  const byId = new Map(
    (data ?? []).map((row) => [
      row.user_id as string,
      {
        id: row.user_id as string,
        nickname: (row.nickname as string) || "유저",
        badge: (row.badge as string) || "올블루 스타터",
      },
    ])
  );
  return userIds.map(
    (id) => byId.get(id) ?? { id, nickname: "유저", badge: "올블루 스타터" }
  );
}

export async function loadAppSnapshot(user?: User | null) {
  const [reviews, picks] = await Promise.all([loadReviews(), loadPicks()]);
  let workStatuses: Record<string, Record<string, WorkStatus>> = {};
  let workStatusUpdatedAt: Record<string, Record<string, string>> = {};
  if (user) {
    const { statuses, times } = await loadWorkStatuses(user.id);
    workStatuses = { [user.id]: statuses };
    workStatusUpdatedAt = { [user.id]: times };
  }
  return {
    users: user ? [user] : [],
    currentUserId: user?.id,
    workStatuses,
    workStatusUpdatedAt,
    reviews,
    picks,
  };
}
