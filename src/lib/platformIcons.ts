/** 작품 상세「볼 수 있는 곳」플랫폼 아이콘 매핑 */

const PLATFORM_ICON_FILES: Record<string, string> = {
  netflix: "netflix.svg",
  "netflix standard with ads": "netflix.svg",
  watcha: "watcha.svg",
  tving: "tving.svg",
  wavve: "wavve.svg",
  "disney plus": "disney-plus.svg",
  "disney+": "disney-plus.svg",
  disneyplus: "disney-plus.svg",
  "amazon prime video": "amazon-prime-video.svg",
  "prime video": "amazon-prime-video.svg",
  amazonprimevideo: "amazon-prime-video.svg",
  "apple tv": "apple-tv.svg",
  appletv: "apple-tv.svg",
  plex: "plex.svg",
  youtube: "youtube.svg",
  "google play": "google-play.svg",
  "google play movies": "google-play.svg",
  googleplaymovies: "google-play.svg",
  laftel: "laftel.svg",
  라프텔: "laftel.svg",
  "naver webtoon": "naver-webtoon.svg",
  naverwebtoon: "naver-webtoon.svg",
  "naver series": "naver-series.svg",
  naverseries: "naver-series.svg",
  "kakao page": "kakao-page.svg",
  kakaopage: "kakao-page.svg",
  "kakao webtoon": "kakao-webtoon.svg",
  kakaowebtoon: "kakao-webtoon.svg",
  lezhin: "lezhin.svg",
  bomtoon: "bomtoon.svg",
  toomics: "toomics.svg",
  toptoon: "toptoon.svg",
};

function normalizePlatformKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** `/platforms/...` 경로. 매칭 실패 시 null */
export function platformIconSrc(platformName: string): string | null {
  const key = normalizePlatformKey(platformName);
  const file =
    PLATFORM_ICON_FILES[key] ??
    PLATFORM_ICON_FILES[key.replace(/\s/g, "")] ??
    null;
  return file ? `/platforms/${file}` : null;
}
