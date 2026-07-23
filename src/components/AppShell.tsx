"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, updateNickname } from "@/lib/auth";
import { trackSearchResultView } from "@/lib/analytics";
import { NICKNAME_PLACEHOLDER, validateNickname } from "@/lib/nickname";
import { searchWorks } from "@/lib/works";
import { useAllbluState } from "@/lib/useAllbluState";
import type { WorkType } from "@/lib/types";
import Footer from "./Footer";
import Logo from "./Logo";
import Toast, { showToast } from "./Toast";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCloseTimer = useRef<number | null>(null);
  const lastSearchKey = useRef<string>("");
  const user = state.users.find((item) => item.id === state.currentUserId);
  const results = useMemo(
    () => searchWorks(query, scope),
    [query, scope, worksRevision]
  );

  const clearMenuCloseTimer = () => {
    if (menuCloseTimer.current != null) {
      window.clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
  };

  const openMenu = () => {
    clearMenuCloseTimer();
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    clearMenuCloseTimer();
    menuCloseTimer.current = window.setTimeout(() => setMenuOpen(false), 150);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => clearMenuCloseTimer();
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
              className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-search"
              aria-hidden
            />
          ) : user ? (
            <div
              ref={menuRef}
              className="relative shrink-0"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleCloseMenu}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blueSoft text-sm font-black text-brand transition hover:ring-2 hover:ring-brand/20"
                aria-label="계정 메뉴"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {(user.nickname || "유").slice(0, 1)}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[148px] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-menu"
                >
                  <Link
                    href="/mypage"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-bold text-ink hover:bg-[#f3f4f6]"
                  >
                    마이페이지
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setNicknameModalOpen(true);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm font-bold text-ink hover:bg-[#f3f4f6]"
                  >
                    회원정보 변경
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm font-bold text-[#ef4444] hover:bg-[#fef2f2]"
                  >
                    로그아웃
                  </button>
                </div>
              ) : null}
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

      {user ? (
        <NicknameChangeModal
          open={nicknameModalOpen}
          currentNickname={user.nickname}
          userId={user.id}
          onClose={() => setNicknameModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function NicknameChangeModal({
  open,
  currentNickname,
  userId,
  onClose,
}: {
  open: boolean;
  currentNickname: string;
  userId: string;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNickname(currentNickname);
    setError("");
    setSaving(false);
  }, [open, currentNickname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = async () => {
    const check = validateNickname(nickname);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (check.value === currentNickname) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    const result = await updateNickname(userId, check.value);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    showToast("닉네임이 변경되었습니다");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-panel md:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-change-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-brand">회원정보 변경</p>
            <h2
              id="nickname-change-title"
              className="mt-1 text-xl font-black tracking-tight text-ink"
            >
              닉네임 변경
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-muted">다른 유저에게 표시될 이름이에요.</p>

        <label className="mb-1.5 block text-sm font-bold text-ink" htmlFor="nickname-input">
          닉네임
        </label>
        <input
          id="nickname-input"
          value={nickname}
          maxLength={12}
          autoFocus
          autoComplete="nickname"
          onChange={(event) => {
            setNickname(event.target.value);
            if (error) setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
          }}
          placeholder={NICKNAME_PLACEHOLDER}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand"
        />
        {error ? (
          <p className="mt-2 text-xs font-bold text-[#ef4444]">{error}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">띄어쓰기 없이 1~12자, 특수문자 불가</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-line bg-white px-5 py-2 text-sm font-bold text-ink"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>
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
