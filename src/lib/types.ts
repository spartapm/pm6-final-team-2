export type WorkType = "anime" | "webtoon";
export type WorkStatus = "KEEP" | "WATCHING" | "DONE" | "STOPPED";
export type StatusAction = WorkStatus | "CANCEL";

export type Work = {
  id: string;
  title: string;
  type: WorkType;
  thumbnailUrl?: string;
  coverTone: string;
  rating?: number;
  ratingCount: number;
  genres: string[];
  overview: string;
  platform: string[];
  statusLabel: string;
  meta: {
    original?: string;
    studio?: string;
    director?: string;
    writer?: string;
    illustrator?: string;
    episodes: string;
    period: string;
  };
};

export type User = {
  id: string;
  nickname: string;
  password: string;
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

export type AppState = {
  users: User[];
  currentUserId?: string;
  workStatuses: Record<string, Record<string, WorkStatus>>;
  reviews: Review[];
  picks: Ollpick[];
};
