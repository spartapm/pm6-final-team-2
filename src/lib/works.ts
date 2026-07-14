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

/** Google Sheet 카탈로그. 초기값=빌드 JSON, 앱 시작 시 /api/works 로 갱신 */
export let works: Work[] = worksData as Work[];

let workMap = new Map(works.map((work) => [work.id, work]));

export function setWorksCatalog(next: Work[]) {
  if (!Array.isArray(next) || next.length === 0) return;
  works = next;
  workMap = new Map(next.map((work) => [work.id, work]));
}

export function getWorks() {
  return works;
}

export function getWork(id: string) {
  return workMap.get(id);
}

export function worksByType(type: WorkType) {
  return works.filter((work) => work.type === type);
}

export function searchWorks(query: string, scope: "all" | WorkType = "all") {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const scored = works
    .filter((work) => scope === "all" || work.type === scope)
    .map((work) => {
      const score = bestSearchScore(work, normalized);
      return score ? { work, ...score } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  scored.sort((a, b) => {
    // 1) 글자 일치 수 많은 순
    if (b.matchLen !== a.matchLen) return b.matchLen - a.matchLen;
    // 2) 일치 위치가 앞일수록 우선
    if (a.position !== b.position) return a.position - b.position;
    // 동점이면 제목이 짧은 쪽(일치 비중 높음)
    return a.fieldLen - b.fieldLen;
  });

  return scored.slice(0, 8).map((item) => item.work);
}

/** 제목·원제 중 더 좋은 매칭(일치 글자 수↑, 위치 앞↑)을 선택 */
function bestSearchScore(work: Work, query: string) {
  const fields = [work.title, work.meta.original ?? ""];
  let best: { matchLen: number; position: number; fieldLen: number } | null = null;

  for (const field of fields) {
    const hay = field.toLowerCase();
    if (!hay) continue;

    const position = hay.indexOf(query);
    if (position < 0) continue;

    // 연속 일치 글자 수 = 쿼리 길이. 제목 전체 일치면 가중치로 최상단.
    const matchLen = hay === query ? query.length + hay.length : query.length;
    const fieldLen = hay.length;

    if (
      !best ||
      matchLen > best.matchLen ||
      (matchLen === best.matchLen && position < best.position) ||
      (matchLen === best.matchLen &&
        position === best.position &&
        fieldLen < best.fieldLen)
    ) {
      best = { matchLen, position, fieldLen };
    }
  }

  return best;
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

/** 웹툰 연재중 탭: 월~일 → 비정기 연재 */
export const WEBTOON_SERIAL_DAY_SECTIONS = [
  { code: "MON", label: "월" },
  { code: "TUE", label: "화" },
  { code: "WED", label: "수" },
  { code: "THU", label: "목" },
  { code: "FRI", label: "금" },
  { code: "SAT", label: "토" },
  { code: "SUN", label: "일" },
  { code: "IRREGULAR", label: "비정기 연재" },
] as const;

export type WebtoonSerialDayCode = (typeof WEBTOON_SERIAL_DAY_SECTIONS)[number]["code"];

const DAY_NAME_TO_CODE: Record<string, WebtoonSerialDayCode> = {
  월: "MON",
  화: "TUE",
  수: "WED",
  목: "THU",
  금: "FRI",
  토: "SAT",
  일: "SUN",
  월요일: "MON",
  화요일: "TUE",
  수요일: "WED",
  목요일: "THU",
  금요일: "FRI",
  토요일: "SAT",
  일요일: "SUN",
  비정기: "IRREGULAR",
  "비정기 연재": "IRREGULAR",
};

const VALID_DAY_CODES = new Set<string>(WEBTOON_SERIAL_DAY_SECTIONS.map((s) => s.code));

/** day_code 우선, 없으면 day_name 매핑. 유효 코드만 반환 */
export function resolveSerialDayCodes(work: Work): WebtoonSerialDayCode[] {
  const fromCodes = (work.serialDayCodes ?? [])
    .map((code) => String(code).trim().toUpperCase())
    .filter((code): code is WebtoonSerialDayCode => VALID_DAY_CODES.has(code));
  if (fromCodes.length) return [...new Set(fromCodes)];

  const fromNames = (work.serialDays ?? [])
    .map((name) => DAY_NAME_TO_CODE[String(name).trim()])
    .filter((code): code is WebtoonSerialDayCode => Boolean(code));
  return [...new Set(fromNames)];
}

/**
 * 연재중 웹툰을 요일 섹션으로 묶음.
 * IRREGULAR 이거나 연재요일이 없으면 비정기 연재.
 * 복수 요일이면 해당 요일 섹션에 각각 배치.
 */
export function groupOngoingWebtoonsBySerialDay(works: Work[]) {
  const buckets = new Map<WebtoonSerialDayCode, Work[]>(
    WEBTOON_SERIAL_DAY_SECTIONS.map((section) => [section.code, []])
  );

  const ongoing = works.filter((work) => work.statusLabel === "연재 중");

  for (const work of ongoing) {
    const codes = resolveSerialDayCodes(work);
    const weekdays = codes.filter((code) => code !== "IRREGULAR");
    const hasIrregular = codes.includes("IRREGULAR");

    if (!codes.length || (hasIrregular && !weekdays.length)) {
      buckets.get("IRREGULAR")!.push(work);
      continue;
    }

    for (const code of weekdays) {
      buckets.get(code)!.push(work);
    }
    if (hasIrregular) {
      buckets.get("IRREGULAR")!.push(work);
    }
  }

  return WEBTOON_SERIAL_DAY_SECTIONS.map((section) => ({
    code: section.code,
    label: section.label,
    works: buckets.get(section.code) ?? [],
  }));
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
