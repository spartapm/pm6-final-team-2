import type { Review } from "./types";

export type WorkRatingStats = {
  average: number;
  count: number;
};

/** 유저 평가글 기준 작품별 평균 평점·평가 수 (없으면 0.0 / 0) */
export function buildRatingStatsMap(reviews: Review[]): Map<string, WorkRatingStats> {
  const acc = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const cur = acc.get(review.workId) ?? { sum: 0, count: 0 };
    cur.sum += review.rating;
    cur.count += 1;
    acc.set(review.workId, cur);
  }

  const out = new Map<string, WorkRatingStats>();
  Array.from(acc.entries()).forEach(([workId, { sum, count }]) => {
    out.set(workId, {
      average: Math.round((sum / count) * 10) / 10,
      count,
    });
  });
  return out;
}

export function ratingStatsForWork(
  reviews: Review[],
  workId: string
): WorkRatingStats {
  return buildRatingStatsMap(reviews).get(workId) ?? { average: 0, count: 0 };
}

export function formatAverage(average: number) {
  return average.toFixed(1);
}
