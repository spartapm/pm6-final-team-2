import type { StatusAction, Work, WorkStatus, WorkType } from "./types";
import worksData from "./works.data.json";

export const statusOptions: {
  code: StatusAction;
  label: string;
  icon: string;
}[] = [
  { code: "KEEP", label: "볼 예정", icon: "📌" },
  { code: "WATCHING", label: "보는 중", icon: "▶️" },
  { code: "DONE", label: "완료", icon: "✅" },
  { code: "STOPPED", label: "중단", icon: "⏸️" },
  { code: "CANCEL", label: "취소", icon: "❌" },
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
