"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listFollowers, listFollowing, type FollowListUser } from "@/lib/store";

type Tab = "followers" | "following";

export default function FollowListModal({
  open,
  onClose,
  ownerUserId,
  ownerNickname,
  initialTab = "followers",
  followerCount,
  followingCount,
}: {
  open: boolean;
  onClose: () => void;
  ownerUserId: string;
  ownerNickname: string;
  initialTab?: Tab;
  followerCount: number;
  followingCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<FollowListUser[]>([]);
  const [following, setFollowing] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [f1, f2] = await Promise.all([
          listFollowers(ownerUserId),
          listFollowing(ownerUserId),
        ]);
        if (cancelled) return;
        setFollowers(f1);
        setFollowing(f2);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ownerUserId]);

  if (!open) return null;

  const list = tab === "followers" ? followers : following;

  const goProfile = (userId: string) => {
    onClose();
    router.push(`/mypage/${userId}`);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${ownerNickname} 팔로우 목록`}
        className="flex max-h-[min(80vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-black">{ownerNickname}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-muted hover:bg-surface"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-line">
          {(
            [
              ["followers", `팔로워 ${followerCount}`, followers.length],
              ["following", `팔로잉 ${followingCount}`, following.length],
            ] as const
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative flex-1 px-3 py-3 text-sm font-bold transition ${
                  active ? "text-brand" : "text-muted hover:text-ink"
                }`}
              >
                {label}
                {active ? (
                  <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-muted">불러오는 중…</p>
          ) : list.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              {tab === "followers" ? "아직 팔로워가 없습니다." : "아직 팔로잉이 없습니다."}
            </p>
          ) : (
            <ul>
              {list.map((person) => (
                <li key={person.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => goProfile(person.id)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-search text-sm font-black text-ink">
                      {person.nickname.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-ink">
                        {person.nickname}
                      </span>
                      <span className="mt-0.5 block text-xs font-bold text-muted">
                        {person.badge}
                      </span>
                    </span>
                    <span className="text-lg text-muted" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
