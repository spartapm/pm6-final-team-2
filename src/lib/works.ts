import type { StatusAction, Work, WorkStatus, WorkType } from "./types";
import worksData from "./works.data.json";

const STATUS_ICON_FILES: Record<StatusAction, string> = {
  KEEP: "Keep",
  WATCHING: "Watching",
  DONE: "Done",
  STOPPED: "Stopped",
  CANCEL: "Cancel",
};

export function statusIconSrc(code: StatusAction, variant: "brand" | "white" = "brand") {
  const file = STATUS_ICON_FILES[code];
  return variant === "white" ? `/status/${file}-white.png` : `/status/${file}.png`;
}

export const statusOptions: {
  code: StatusAction;
  label: string;
  icon: string;
}[] = [
  { code: "KEEP", label: "볼 예정", icon: statusIconSrc("KEEP") },
  { code: "WATCHING", label: "보는 중", icon: statusIconSrc("WATCHING") },
  { code: "DONE", label: "완료", icon: statusIconSrc("DONE") },
  { code: "STOPPED", label: "중단", icon: statusIconSrc("STOPPED") },
  { code: "CANCEL", label: "취소", icon: statusIconSrc("CANCEL") },
];

/** Google Sheet → works.data.json (Supabase works 테이블 없음). 갱신: npm run generate:works */
export const works: Work[] = worksData as Work[];

const workMap = new Map(works.map((work) => [work.id, work]));

export function getWork(id: string) {
  return workMap.get(id);
}

export function worksByType(type: WorkType) {
  return works.filter((work) => work.type === type);
}

export function searchWorks(query: string, scope: "all" | WorkType = "all") {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return works
    .filter((work) => scope === "all" || work.type === scope)
    .filter(
      (work) =>
        work.title.toLowerCase().includes(normalized) ||
        (work.meta.original ?? "").toLowerCase().includes(normalized)
    )
    .slice(0, 8);
}

export function statusMeta(status?: WorkStatus) {
  return statusOptions.find((option) => option.code === status);
}

/** 카탈로그용: 완결/종료 계열 */
export function isCompletedStatus(label: string) {
  return ["완결", "방영 종료", "개봉"].includes(label);
}

/** 카탈로그용: 연재/방영 중 계열 */
export function isOngoingStatus(label: string) {
  return ["연재 중", "방영 중", "공개 예정", "제작 중"].includes(label);
}

/** 타입별 장르 빈도순 (필터 칩용) */
export function topGenresForType(type: WorkType, limit = 12) {
  const counts = new Map<string, number>();
  for (const work of worksByType(type)) {
    for (const genre of work.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, limit)
    .map(([name]) => name);
}
