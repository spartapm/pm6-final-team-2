"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "@/lib/auth";
import { trackSearchResultView } from "@/lib/analytics";
import { searchWorks } from "@/lib/works";
import { useAllbluState } from "@/lib/useAllbluState";
import type { WorkType } from "@/lib/types";
import Footer from "./Footer";
import Logo from "./Logo";
import Toast from "./Toast";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/webtoon", label: "웹툰" },
  { href: "/anime", label: "애니" },
  { href: "/ollpick", label: "올블픽" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { state, ready, worksRevision } = useAllbluState();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | WorkType>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const lastSearchKey = useRef<string>("");
  const user = state.users.find((item) => item.id === state.currentUserId);
  const results = useMemo(
    () => searchWorks(query, scope),
    [query, scope, worksRevision]
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!searchOpen || !trimmed) {
      lastSearchKey.current = "";
      return;
    }
    const key = `${scope}:${trimmed}:${results.length}`;
    if (lastSearchKey.current === key) return;
    const t = window.setTimeout(() => {
      lastSearchKey.current = key;
      trackSearchResultView({
        categoryFilter: scope,
        resultCount: results.length,
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchOpen, query, scope, results.length]);

  const openWorkFromSearch = (workId: string) => {
    sessionStorage.setItem("allblu_last_entry_source", "search");
    setQuery("");
    setSearchOpen(false);
    router.push(`/works/${workId}`);
  };

  return (
    <div className="flex min-h-[100svh] flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-[72px] items-center gap-5 px-5 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-5 text-[15px] font-bold sm:flex">
            {navItems.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "text-brand" : "text-ink hover:text-brand"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div ref={searchRef} className="relative ml-auto hidden min-w-0 flex-1 max-w-[420px] md:block">
            <div className="flex items-center gap-2 rounded-full bg-search px-4 py-2.5">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="작품 검색"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as "all" | WorkType)}
                className="bg-transparent text-xs font-bold text-ink outline-none"
              >
                <option value="all">전체</option>
                <option value="anime">애니</option>
                <option value="webtoon">웹툰</option>
              </select>
            </div>
            {searchOpen && query.trim() ? (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-menu">
                {results.length ? (
                  results.map((work) => (
                    <button
                      key={work.id}
                      type="button"
                      onClick={() => openWorkFromSearch(work.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-blueSoft"
                    >
                      <span className="font-bold">{work.title}</span>
                      <span className="text-xs text-muted">
                        {work.type === "anime" ? "애니" : "웹툰"}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">검색 결과가 없습니다.</p>
                )}
              </div>
            ) : null}
          </div>

          {/* 세션 확인 전에는 비로그인 CTA를 그리지 않음 (깜빡임·오클릭 방지) */}
          {!ready ? (
            <div
              className="h-10 w-[88px] shrink-0 animate-pulse rounded-full bg-search"
              aria-hidden
            />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/mypage"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 text-ink hover:border-brand hover:text-brand"
                aria-label="마이페이지"
              >
                <UserIcon />
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="hidden text-xs font-bold text-muted hover:text-ink md:block"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/signup" className="btn-primary px-3 py-2 text-[13px]">
                회원가입
              </Link>
              <Link href="/login" className="btn-ghost px-2 py-2 text-[13px]">
                로그인
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

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="#6b7280" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
