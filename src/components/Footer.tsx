export default function Footer() {
  return (
    <footer className="mt-auto bg-footer px-8 py-10 text-[13px] leading-7 text-white/90 md:px-12">
      <p>서비스에 문제나 건의사항이 있으시면 다음 연락처로 알려주세요.</p>
      <p className="text-white/70">xhdsxhd@gmail.com</p>
      <p className="mt-3">이 서비스는 비상업적 MVP 검증 목적으로 제작되었습니다.</p>
      <p>
        웹툰 정보는{" "}
        <a
          className="underline underline-offset-2"
          href="https://anilist.co"
          target="_blank"
          rel="noreferrer"
        >
          AniList
        </a>{" "}
        API를 사용합니다.
      </p>
      <p>AniList 데이터는 MVP 기능 검증 용도로만 사용하며 외부 배포·판매하지 않습니다.</p>
      <p>
        애니메이션 정보는{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noreferrer"
        >
          TMDB
        </a>{" "}
        API를 사용합니다.
      </p>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      <p>
        시청 가능 플랫폼 정보 제공:{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.justwatch.com/"
          target="_blank"
          rel="noreferrer"
        >
          JustWatch
        </a>
      </p>
      <p className="mt-6 text-white">팀 2게진짜_최종 제공</p>
    </footer>
  );
}
