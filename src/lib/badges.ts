import type { WorkStatus } from "./types";

export type BadgeCategory = "service" | "genre" | "webtoon" | "anime";

export type BadgeConditionKey = "saves" | "picks" | "reviews";

export type BadgeCondition = {
  key: BadgeConditionKey;
  label: string;
  target: number;
};

export type BadgeIconId =
  | "sailboat"
  | "compass"
  | "anchor"
  | "wheel"
  | "diamond"
  | "crown";

export type BadgeDef = {
  id: string;
  order: number;
  name: string;
  /** 카드·모달 설명 (O 마크 문구) */
  description: string;
  category: BadgeCategory;
  icon: BadgeIconId;
  conditions: BadgeCondition[];
  /** 가입 시 자동 획득 */
  autoGrant?: boolean;
  autoNote?: string;
};

export const BADGE_CATEGORIES: { id: BadgeCategory; label: string }[] = [
  { id: "service", label: "서비스 이용" },
  { id: "genre", label: "장르" },
  { id: "webtoon", label: "웹툰" },
  { id: "anime", label: "애니" },
];

/** 서비스 이용 배지 0~5 */
export const SERVICE_BADGES: BadgeDef[] = [
  {
    id: "starter",
    order: 0,
    name: "0. 올블루 스타터",
    description: "올블루와 함께 항해를 시작했어요.",
    category: "service",
    icon: "sailboat",
    conditions: [],
    autoGrant: true,
    autoNote: "가입과 함께 자동으로 획득하는 기본 배지예요.",
  },
  {
    id: "rookie",
    order: 1,
    name: "1. 신입 선원",
    description: "처음으로 작품 컬렉션을 채웠어요.",
    category: "service",
    icon: "compass",
    conditions: [{ key: "saves", label: "작품 저장", target: 10 }],
  },
  {
    id: "apprentice",
    order: 2,
    name: "2. 견습 항해사",
    description: "저장과 추천, 평가 활동을 고르게 시작했어요.",
    category: "service",
    icon: "anchor",
    conditions: [
      { key: "saves", label: "작품 저장", target: 5 },
      { key: "picks", label: "올블픽 작성", target: 3 },
      { key: "reviews", label: "평가글 작성", target: 3 },
    ],
  },
  {
    id: "veteran",
    order: 3,
    name: "3. 베테랑 항해사",
    description: "꾸준한 활동으로 긴 항해의 경험을 쌓았어요.",
    category: "service",
    icon: "wheel",
    conditions: [
      { key: "saves", label: "작품 저장", target: 30 },
      { key: "picks", label: "올블픽 작성", target: 10 },
      { key: "reviews", label: "평가글 작성", target: 10 },
    ],
  },
  {
    id: "captain",
    order: 4,
    name: "4. 선장",
    description: "풍부한 작품 경험을 다른 유저와 나누고 있어요.",
    category: "service",
    icon: "diamond",
    conditions: [
      { key: "saves", label: "작품 저장", target: 50 },
      { key: "picks", label: "올블픽 작성", target: 20 },
      { key: "reviews", label: "평가글 작성", target: 20 },
    ],
  },
  {
    id: "pirateKing",
    order: 5,
    name: "5. 해적왕",
    description: "올블루의 모든 활동을 능숙하게 즐기고 있어요.",
    category: "service",
    icon: "crown",
    conditions: [
      { key: "saves", label: "작품 저장", target: 100 },
      { key: "picks", label: "올블픽 작성", target: 50 },
      { key: "reviews", label: "평가글 작성", target: 50 },
    ],
  },
];

export type BadgeActivityStats = {
  saves: number;
  picks: number;
  reviews: number;
};

export type BadgeProgress = {
  key: BadgeConditionKey;
  label: string;
  current: number;
  target: number;
  ratio: number;
};

export type BadgeView = BadgeDef & {
  earned: boolean;
  isRepresentative: boolean;
  progress: BadgeProgress[];
};

export function buildActivityStats(input: {
  statuses: Record<string, WorkStatus>;
  pickCount: number;
  reviewCount: number;
}): BadgeActivityStats {
  return {
    saves: Object.keys(input.statuses).length,
    picks: input.pickCount,
    reviews: input.reviewCount,
  };
}

export function evaluateBadges(stats: BadgeActivityStats): BadgeView[] {
  const views: BadgeView[] = SERVICE_BADGES.map((badge) => {
    const progress = badge.conditions.map((condition) => {
      const current = Math.min(stats[condition.key], condition.target);
      return {
        key: condition.key,
        label: condition.label,
        current: stats[condition.key],
        target: condition.target,
        ratio:
          condition.target <= 0
            ? 1
            : Math.min(1, stats[condition.key] / condition.target),
      };
    });
    const earned =
      Boolean(badge.autoGrant) ||
      (badge.conditions.length > 0 &&
        badge.conditions.every((c) => stats[c.key] >= c.target));
    return {
      ...badge,
      earned,
      isRepresentative: false,
      progress,
    };
  });

  // 대표 배지 = 획득한 배지 중 가장 높은 등급(최근 달성으로 간주)
  let representativeId: string | null = null;
  for (let i = views.length - 1; i >= 0; i -= 1) {
    if (views[i].earned) {
      representativeId = views[i].id;
      break;
    }
  }
  return views.map((badge) => ({
    ...badge,
    isRepresentative: badge.id === representativeId,
  }));
}

export function representativeBadgeName(views: BadgeView[]) {
  return views.find((badge) => badge.isRepresentative)?.name.replace(/^\d+\.\s*/, "")
    ?? "올블루 스타터";
}

export function emptyStateCopy(category: BadgeCategory) {
  if (category === "genre") {
    return {
      title: "장르 배지를 준비하고 있어요",
      body: "새로운 업적 배지는 추후 추가될 예정입니다",
    };
  }
  if (category === "webtoon") {
    return {
      title: "웹툰 배지를 준비하고 있어요",
      body: "새로운 업적 배지는 추후 추가될 예정입니다",
    };
  }
  if (category === "anime") {
    return {
      title: "애니 배지를 준비하고 있어요",
      body: "새로운 업적 배지는 추후 추가될 예정입니다",
    };
  }
  return {
    title: "정식 배지를 준비하고 있어요.",
    body: "새로운 업적 배지는 추후 추가될 예정입니다",
  };
}
