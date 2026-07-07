import type { StatusAction, Work, WorkStatus, WorkType } from "./types";

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

const tones = [
  "from-slate-200 to-slate-300",
  "from-blue-100 to-slate-300",
  "from-indigo-100 to-slate-300",
  "from-violet-100 to-slate-300",
  "from-cyan-100 to-slate-300",
  "from-rose-100 to-slate-300",
];

const animeTitles = [
  "주술회전 3기",
  "망송의 프리렌",
  "귀멸의 칼날",
  "단죄의 기억",
  "체인소맨",
  "하이큐",
  "세일소폰",
  "장송의 프리렌",
  "블루 록",
  "스파이 패밀리",
  "나의 히어로 아카데미아",
  "약사의 혼잣말",
  "진격의 거인",
  "원피스",
  "도쿄 리벤저스",
  "괴수 8호",
  "최애의 아이",
  "은혼",
  "슬램덩크",
  "바이올렛 에버가든",
  "데스노트",
  "사이버펑크 엣지러너",
  "소드 아트 온라인",
  "헌터 x 헌터",
  "강철의 연금술사",
  "너의 이름은",
  "스즈메의 문단속",
  "날씨의 아이",
  "모브사이코 100",
  "던전밥",
  "블리치",
  "나루토",
  "카구야 님은 고백받고 싶어",
  "청춘 돼지는 바니걸 선배의 꿈을 꾸지 않는다",
  "코드기어스",
  "에반게리온",
];

const webtoonTitles = [
  "화산귀환",
  "전지적 독자 시점",
  "나 혼자만 레벨업",
  "외모지상주의",
  "윈드브레이커",
  "참교육",
  "신의 탑",
  "유미의 세포들",
  "여신강림",
  "독립일기",
  "호랑이형님",
  "마루는 강쥐",
  "이번 생도 잘 부탁해",
  "재벌집 막내아들",
  "어느 날 공주가 되어버렸다",
  "고수",
  "광장",
  "연애혁명",
  "마음의 소리",
  "쌉니다 천리마마트",
  "노블레스",
  "더 복서",
  "캐슬",
  "격기3반",
  "정글쥬스",
  "아비무쌍",
  "묵향 다크레이디",
  "치즈인더트랩",
  "나노마신",
  "소녀의 세계",
  "바른연애 길잡이",
  "하루만 네가 되고 싶어",
  "가비지타임",
  "물위의 우리",
  "집이 없어",
  "스터디그룹",
];

function makeWork(title: string, index: number, type: WorkType): Work {
  const genres = type === "anime"
    ? ["액션", "판타지", index % 2 ? "드라마" : "이세계"]
    : ["액션", index % 2 ? "로맨스" : "무협", "드라마"];

  return {
    id: `${type}-${index + 1}`,
    title,
    type,
    coverTone: tones[index % tones.length],
    rating: Number((4 + ((index * 7) % 10) / 10).toFixed(1)),
    ratingCount: 1200 + index * 137,
    genres,
    overview:
      type === "anime"
        ? `${title}은 몰입감 있는 세계관과 캐릭터의 성장을 따라가는 애니메이션 작품입니다.`
        : `${title}은 연재 흐름과 캐릭터 관계가 돋보이는 웹툰 작품입니다.`,
    platform: type === "anime" ? ["Netflix", "TVING", "Watcha"] : ["Naver Webtoon", "Kakao Webtoon"],
    statusLabel: index % 3 === 0 ? "연재중" : "완결",
    meta: {
      original: title,
      studio: type === "anime" ? "ALLBLU Studio" : undefined,
      director: type === "anime" ? "김올블루" : undefined,
      writer: type === "webtoon" ? "스토리 작가" : undefined,
      illustrator: type === "webtoon" ? "그림 작가" : undefined,
      episodes: type === "anime" ? `${12 + (index % 4) * 12}화` : `${80 + index * 3}화`,
      period: type === "anime" ? "2024.01 ~ 2024.06" : "2021.03 ~ 연재중",
    },
  };
}

export const works: Work[] = [
  ...animeTitles.map((title, index) => makeWork(title, index, "anime")),
  ...webtoonTitles.map((title, index) => makeWork(title, index, "webtoon")),
];

export function getWork(id: string) {
  return works.find((work) => work.id === id);
}

export function worksByType(type: WorkType) {
  return works.filter((work) => work.type === type);
}

export function searchWorks(query: string, scope: "all" | WorkType = "all") {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return works
    .filter((work) => scope === "all" || work.type === scope)
    .filter((work) => work.title.toLowerCase().includes(normalized))
    .slice(0, 8);
}

export function statusMeta(status?: WorkStatus) {
  return statusOptions.find((option) => option.code === status);
}
