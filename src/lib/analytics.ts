"use client";

import type { WorkStatus } from "./types";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type PageType =
  | "auth"
  | "home"
  | "anime"
  | "webtoon"
  | "work_detail"
  | "eval_detail"
  | "ollpick"
  | "userrec_detail"
  | "mypage"
  | "ollpick_write";

export type EntrySource =
  | "direct"
  | "home"
  | "search"
  | "anime_list"
  | "webtoon_list"
  | "ollpick_list"
  | "work_detail_section"
  | "userrec_detail"
  | "mypage";

export type StatusValue = "keep" | "watching" | "done" | "stopped" | "cancel";
export type PrevStatus = StatusValue | "none";
export type SaveSurface = "thumbnail" | "work_detail" | "mylib";

export type RecommendClickSurface =
  | "home_recent"
  | "ollpick_top"
  | "ollpick_list"
  | "work_detail_section"
  | "userrec_detail";

export type AgreeSurface = "ollpick_list" | "userrec_detail";

export type BlockedFeature =
  | "status_save"
  | "recommend_write"
  | "agree"
  | "evaluation_write"
  | "empathy";

export type ErrorType = "write_submit_fail" | "agree_submit_fail" | "page_load_fail";

const ATTR_KEY = "allblu_recommend_attribution";
const LAST_PAGE_KEY = "allblu_last_page_type";
const LAST_ENTRY_KEY = "allblu_last_entry_source";

type Attribution = {
  recommend_id: string;
  recommended_work_id: string;
  agree_count: number;
};

function canTrack() {
  return typeof window !== "undefined";
}

/** null로 비워 이전 dataLayer 값이 남지 않게 함 */
function withNulls<T extends Record<string, unknown>>(params: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = value === undefined ? null : value;
  }
  return out;
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (!canTrack()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...withNulls(params),
  });
}

export function trackUserContext(userId: string | null | undefined) {
  const isLoggedIn = Boolean(userId);
  trackEvent("allblu_user_context", {
    user_id: isLoggedIn ? String(userId) : null,
    member_status: isLoggedIn ? "member" : "guest",
  });
}

export function mapWorkStatus(status?: WorkStatus | null): StatusValue | "none" {
  if (!status) return "none";
  const map: Record<WorkStatus, StatusValue> = {
    KEEP: "keep",
    WATCHING: "watching",
    DONE: "done",
    STOPPED: "stopped",
  };
  return map[status];
}

export function setRecommendAttribution(input: Attribution) {
  if (!canTrack()) return;
  sessionStorage.setItem(ATTR_KEY, JSON.stringify(input));
}

export function getRecommendAttribution(): Attribution | null {
  if (!canTrack()) return null;
  try {
    const raw = sessionStorage.getItem(ATTR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Attribution;
  } catch {
    return null;
  }
}

export function clearRecommendAttribution() {
  if (!canTrack()) return;
  sessionStorage.removeItem(ATTR_KEY);
}

function pageTypeToEntrySource(pageType: PageType): EntrySource {
  switch (pageType) {
    case "home":
      return "home";
    case "anime":
      return "anime_list";
    case "webtoon":
      return "webtoon_list";
    case "ollpick":
      return "ollpick_list";
    case "work_detail":
      return "work_detail_section";
    case "userrec_detail":
      return "userrec_detail";
    case "mypage":
      return "mypage";
    default:
      return "direct";
  }
}

export function resolvePageContext(pathname: string): {
  page_type: PageType;
  page_id: string | null;
  work_id: string | null;
} {
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return { page_type: "auth", page_id: null, work_id: null };
  }
  if (pathname === "/" || pathname === "") {
    return { page_type: "home", page_id: null, work_id: null };
  }
  if (pathname.startsWith("/anime")) {
    return { page_type: "anime", page_id: null, work_id: null };
  }
  if (pathname.startsWith("/webtoon")) {
    return { page_type: "webtoon", page_id: null, work_id: null };
  }
  if (pathname.startsWith("/works/")) {
    const id = pathname.split("/")[2] ?? null;
    return { page_type: "work_detail", page_id: id, work_id: id };
  }
  if (pathname.startsWith("/reviews/")) {
    const id = pathname.split("/")[2] ?? null;
    return { page_type: "eval_detail", page_id: id, work_id: null };
  }
  if (pathname.startsWith("/ollpick/write")) {
    return { page_type: "ollpick_write", page_id: null, work_id: null };
  }
  if (pathname.startsWith("/ollpick/")) {
    const id = pathname.split("/")[2] ?? null;
    return { page_type: "userrec_detail", page_id: id, work_id: id };
  }
  if (pathname.startsWith("/ollpick")) {
    return { page_type: "ollpick", page_id: null, work_id: null };
  }
  if (pathname.startsWith("/mypage")) {
    const id = pathname.split("/")[2] ?? null;
    return { page_type: "mypage", page_id: id, work_id: null };
  }
  return { page_type: "home", page_id: null, work_id: null };
}

export function trackPageView(pathname: string) {
  if (!canTrack()) return;
  const ctx = resolvePageContext(pathname);
  const entryRaw = sessionStorage.getItem(LAST_ENTRY_KEY);
  const entry_source = (entryRaw as EntrySource | null) ?? "direct";

  const attr = getRecommendAttribution();
  const from_recommend_id =
    ctx.page_type === "work_detail" &&
    attr &&
    attr.recommended_work_id === ctx.work_id
      ? attr.recommend_id
      : null;

  // 추천 경로가 아닌 작품 상세 진입 시 귀속 해제
  if (
    ctx.page_type === "work_detail" &&
    attr &&
    attr.recommended_work_id !== ctx.work_id
  ) {
    clearRecommendAttribution();
  }

  trackEvent("allblu_page_view", {
    page_type: ctx.page_type,
    page_id: ctx.page_id,
    work_id: ctx.work_id,
    entry_source,
    from_recommend_id,
    page_location: window.location.href,
    page_title: document.title,
  });

  sessionStorage.setItem(LAST_PAGE_KEY, ctx.page_type);
  sessionStorage.setItem(LAST_ENTRY_KEY, pageTypeToEntrySource(ctx.page_type));
}

export function trackArchiveStatusSave(input: {
  workId: string;
  statusValue: StatusValue;
  prevStatus: PrevStatus;
  saveSurface: SaveSurface;
}) {
  const attr = getRecommendAttribution();
  const matched =
    attr && attr.recommended_work_id === input.workId ? attr : null;

  trackEvent("archive_status_save", {
    work_id: input.workId,
    status_value: input.statusValue,
    prev_status: input.prevStatus,
    save_surface: input.saveSurface,
    from_recommend_id: matched?.recommend_id ?? null,
    agree_count: matched ? matched.agree_count : null,
  });

  if (matched) clearRecommendAttribution();
}

export function trackOllpickRecommendClick(input: {
  recommendId: string;
  baseWorkId: string;
  recommendedWorkId: string;
  surface: RecommendClickSurface;
  clickTarget: "base_work" | "recommended_work" | "card";
  agreeCount: number;
  /** 추천작 상세로 진입할 때만 귀속 저장 */
  setAttribution?: boolean;
}) {
  trackEvent("ollpick_recommend_click", {
    recommend_id: input.recommendId,
    base_work_id: input.baseWorkId,
    recommended_work_id: input.recommendedWorkId,
    surface: input.surface,
    click_target: input.clickTarget,
    agree_count: input.agreeCount,
  });

  if (input.setAttribution) {
    setRecommendAttribution({
      recommend_id: input.recommendId,
      recommended_work_id: input.recommendedWorkId,
      agree_count: input.agreeCount,
    });
  }
}

export function trackRecommendWriteSubmit(input: {
  baseWorkId: string;
  recommendedWorkId: string;
  reasonLength: number;
  isDuplicatePair: boolean;
}) {
  trackEvent("recommend_write_submit", {
    base_work_id: input.baseWorkId,
    recommended_work_id: input.recommendedWorkId,
    reason_length: input.reasonLength,
    is_duplicate_pair: input.isDuplicatePair,
  });
}

export function trackRecommendAgreeSubmit(input: {
  recommendId: string;
  reasonLength: number;
  surface: AgreeSurface;
}) {
  trackEvent("recommend_agree_submit", {
    recommend_id: input.recommendId,
    reason_length: input.reasonLength,
    surface: input.surface,
  });
}

export function trackRecommendWriteStart() {
  trackEvent("recommend_write_start");
}

export function trackRecommendAgreeStart(input: {
  recommendId: string;
  surface: AgreeSurface;
}) {
  trackEvent("recommend_agree_start", {
    recommend_id: input.recommendId,
    surface: input.surface,
  });
}

export function trackReasonMoreClick(input: {
  recommendId: string;
  surface: RecommendClickSurface;
}) {
  trackEvent("reason_more_click", {
    recommend_id: input.recommendId,
    surface: input.surface,
  });
}

export function trackLoginRequiredShown(blockedFeature: BlockedFeature) {
  trackEvent("login_required_shown", {
    blocked_feature: blockedFeature,
  });
}

export function trackPlatformLinkClick(input: {
  workId: string;
  platformName: string;
}) {
  trackEvent("platform_link_click", {
    work_id: input.workId,
    platform_name: slugPlatformName(input.platformName),
  });
}

export function trackSearchResultView(input: {
  categoryFilter: "all" | "anime" | "webtoon";
  resultCount: number;
}) {
  trackEvent("search_result_view", {
    category_filter: input.categoryFilter,
    result_count: input.resultCount,
  });
}

export function trackAppError(input: {
  errorType: ErrorType;
  pageName: PageType;
}) {
  trackEvent("app_error", {
    error_type: input.errorType,
    page_name: input.pageName,
  });
}

export function slugPlatformName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
