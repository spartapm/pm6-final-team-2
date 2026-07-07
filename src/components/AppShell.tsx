"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { logout } from "@/lib/store";
import { searchWorks } from "@/lib/works";
import { useAllbluState } from "@/lib/useAllbluState";
import type { WorkType } from "@/lib/types";
import Toast from "./Toast";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/webtoon", label: "웹툰" },
  { href: "/anime", label: "애니" },
  { href: "/ollpick", label: "유저추천" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { state } = useAllbluState();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | WorkType>("all");
  const user = state.users.find((item) => item.id === state.currentUserId);
  const results = useMemo(() => searchWorks(query, scope), [query, scope]);

  return (
    <div className="flex min-h-[100svh] flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-[72px] items-center gap-6 px-5">
          <Link href="/" className="flex h-full w-12 items-center justify-center bg-navy text-xs font-black text-white">
            allblu
          </Link>
          <nav className="flex items-center gap-5 text-sm font-bold">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? "text-navy" : "text-ink"}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="relative ml-auto hidden w-[340px] items-center gap-2 rounded-xl bg-[#f4f1fb] px-3 py-2 md:flex">
            <span>🔍</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="작품 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as "all" | WorkType)}
              className="bg-transparent text-xs text-muted outline-none"
            >
              <option value="all">전체</option>
              <option value="anime">애니</option>
              <option value="webtoon">웹툰</option>
            </select>
            {query.trim() && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-line bg-white shadow-menu">
                {results.length ? (
                  results.map((work) => (
                    <button
                      key={work.id}
                      type="button"
                      onClick={() => {
                        setQuery("");
                        router.push(`/works/${work.id}`);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-blueSoft"
                    >
                      <span>{work.title}</span>
                      <span className="text-xs text-muted">{work.type === "anime" ? "애니" : "웹툰"}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">검색 결과가 없습니다.</p>
                )}
              </div>
            )}
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/mypage" className="flex h-10 w-10 items-center justify-center rounded-full border border-ink text-xl">
                ♙
              </Link>
              <button type="button" onClick={logout} className="hidden text-xs text-muted md:block">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold">
              <Link href="/login">로그인</Link>
              <Link href="/signup" className="rounded bg-navy px-3 py-2 text-white">
                회원가입
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
      <Toast />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 bg-[#111] px-8 py-9 text-xs leading-relaxed text-white">
      <p className="mb-4">서비스에 문제가 인식되면 xhdsxhd@gmail.com 연락처로 알려주세요.</p>
      <p>이 서비스는 ALLBLU MVP 검증 목적으로 제작되었습니다.</p>
      <p>팀 2게진짜_최종 제공</p>
      <p className="mt-4">
        AniList 데이터 일부는{" "}
        <a className="underline" href="https://anilist.co" target="_blank" rel="noreferrer">
          AniList API
        </a>
        를 사용합니다.
      </p>
      <p>
        This product uses the TMDB API but is not endorsed or certified by{" "}
        <a className="underline" href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          TMDB
        </a>
        .
      </p>
    </footer>
  );
}
