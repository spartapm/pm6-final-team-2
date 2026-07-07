"use client";

import type { AppState, Ollpick, Review, User, WorkStatus } from "./types";

const KEY = "allblu-state-v1";

export const defaultState: AppState = {
  users: [
    { id: "demo", nickname: "올블루", password: "demo" },
  ],
  currentUserId: undefined,
  workStatuses: {},
  reviews: [
    {
      id: "review-1",
      workId: "anime-8",
      userId: "demo",
      nickname: "올블루",
      rating: 5,
      content: "작품 분위기와 캐릭터 서사가 좋아서 다시 보고 싶은 작품이에요.",
      likeCount: 120,
      createdAt: "2026-07-01T09:00:00.000Z",
    },
    {
      id: "review-2",
      workId: "anime-6",
      userId: "demo",
      nickname: "올블루",
      rating: 4,
      content: "스포츠물 특유의 뜨거운 장면들이 많아서 추천합니다.",
      likeCount: 88,
      createdAt: "2026-07-02T09:00:00.000Z",
    },
    {
      id: "review-3",
      workId: "webtoon-3",
      userId: "demo",
      nickname: "올블루",
      rating: 5,
      content: "빠른 전개와 액션 컷이 좋아서 몰아서 보기 좋습니다.",
      likeCount: 201,
      createdAt: "2026-07-03T09:00:00.000Z",
    },
  ],
  picks: [
    {
      id: "pick-1",
      baseWorkId: "anime-8",
      recommendedWorkId: "anime-1",
      firstRecommender: "올블루",
      agreeUserIds: ["demo"],
      reasons: [
        {
          id: "reason-1",
          userId: "demo",
          nickname: "올블루",
          content: "차분한 세계관을 좋아한다면 전투와 성장 서사도 재미있게 볼 수 있어요.",
          createdAt: "2026-07-03T10:00:00.000Z",
        },
      ],
      createdAt: "2026-07-03T10:00:00.000Z",
    },
  ],
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadState(): AppState {
  if (!canUseStorage()) return defaultState;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("allblu-state-change"));
}

export function updateState(updater: (state: AppState) => AppState) {
  const next = updater(loadState());
  saveState(next);
  return next;
}

export function currentUser(state = loadState()) {
  return state.users.find((user) => user.id === state.currentUserId);
}

export function login(id: string, password: string) {
  const state = loadState();
  const user = state.users.find((item) => item.id === id && item.password === password);
  if (!user) return { ok: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." };
  saveState({ ...state, currentUserId: user.id });
  return { ok: true, user };
}

export function signup(user: User) {
  const state = loadState();
  if (state.users.some((item) => item.id === user.id)) {
    return { ok: false, message: "중복된 ID 입니다." };
  }
  if (state.users.some((item) => item.nickname === user.nickname)) {
    return { ok: false, message: "중복된 닉네임 입니다." };
  }
  if (user.password.length > 20) {
    return { ok: false, message: "비밀번호는 20자 이하로 작성해주세요." };
  }
  saveState({ ...state, users: [...state.users, user] });
  return { ok: true };
}

export function logout() {
  updateState((state) => ({ ...state, currentUserId: undefined }));
}

export function setWorkStatus(userId: string, workId: string, status?: WorkStatus) {
  updateState((state) => {
    const userStatuses = { ...(state.workStatuses[userId] ?? {}) };
    if (status) userStatuses[workId] = status;
    else delete userStatuses[workId];
    return {
      ...state,
      workStatuses: {
        ...state.workStatuses,
        [userId]: userStatuses,
      },
    };
  });
}

export function addReview(input: Omit<Review, "id" | "createdAt" | "likeCount">) {
  return updateState((state) => ({
    ...state,
    reviews: [
      {
        ...input,
        id: `review-${Date.now()}`,
        likeCount: 0,
        createdAt: new Date().toISOString(),
      },
      ...state.reviews,
    ],
  }));
}

export function addPick(input: {
  baseWorkId: string;
  recommendedWorkId: string;
  reason: string;
}) {
  return updateState((state) => {
    const user = currentUser(state);
    if (!user) return state;
    const existing = state.picks.find(
      (pick) =>
        pick.baseWorkId === input.baseWorkId &&
        pick.recommendedWorkId === input.recommendedWorkId
    );
    const reason = {
      id: `reason-${Date.now()}`,
      userId: user.id,
      nickname: user.nickname,
      content: input.reason,
      createdAt: new Date().toISOString(),
    };
    if (existing) {
      return {
        ...state,
        picks: state.picks.map((pick) =>
          pick.id === existing.id
            ? {
                ...pick,
                agreeUserIds: pick.agreeUserIds.includes(user.id)
                  ? pick.agreeUserIds
                  : [...pick.agreeUserIds, user.id],
                reasons: [reason, ...pick.reasons],
              }
            : pick
        ),
      };
    }
    const next: Ollpick = {
      id: `pick-${Date.now()}`,
      baseWorkId: input.baseWorkId,
      recommendedWorkId: input.recommendedWorkId,
      firstRecommender: user.nickname,
      agreeUserIds: [user.id],
      reasons: [reason],
      createdAt: new Date().toISOString(),
    };
    return { ...state, picks: [next, ...state.picks] };
  });
}
