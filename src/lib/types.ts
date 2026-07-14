export type WorkType = "anime" | "webtoon";
export type WorkStatus = "KEEP" | "WATCHING" | "DONE" | "STOPPED";
export type StatusAction = WorkStatus | "CANCEL";

export type WorkPlatform = {
  name: string;
  url?: string;
  offerType?: string;
};

export type Work = {
  id: string;
  title: string;
  type: WorkType;
  thumbnailUrl?: string;
  coverTone: string;
  rating?: number;
  ratingCount: number;
  genres: string[];
  tags?: string[];
  overview: string;
  /** Prefer `platforms` (with URLs). Kept for compatibility. */
  platform: string[];
  platforms?: WorkPlatform[];
  statusLabel: string;
  ageRating?: string;
  serialDays?: string[];
  /** Google Sheet day_code: MON…SUN | IRREGULAR */
  serialDayCodes?: string[];
  meta: {
    original?: string;
    studio?: string;
    studios?: string[];
    director?: string;
    directors?: string[];
    writer?: string;
    writers?: string[];
    illustrator?: string;
    illustrators?: string[];
    episodes: string;
    period: string;
    staffExtra?: string[];
  };
};

export type User = {
  id: string;
  email: string;
  nickname: string;
  bio?: string;
  badge?: string;
};

export type Review = {
  id: string;
  workId: string;
  userId: string;
  nickname: string;
  rating: number;
  content: string;
  likeCount: number;
  createdAt: string;
};

export type PickReason = {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
};

export type Ollpick = {
  id: string;
  baseWorkId: string;
  recommendedWorkId: string;
  firstRecommender: string;
  agreeUserIds: string[];
  reasons: PickReason[];
  createdAt: string;
};

/** Client app snapshot loaded from Supabase */
export type AppState = {
  users: User[];
  currentUserId?: string;
  workStatuses: Record<string, Record<string, WorkStatus>>;
  workStatusUpdatedAt: Record<string, Record<string, string>>;
  reviews: Review[];
  picks: Ollpick[];
};
