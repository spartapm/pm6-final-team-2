"use client";

import { useMemo, useState } from "react";
import AppShell from "./AppShell";
import SectionCarousel from "./SectionCarousel";
import WorkThumbnail from "./WorkThumbnail";
import { worksByType } from "@/lib/works";
import { useAllbluState } from "@/lib/useAllbluState";
import type { WorkType } from "@/lib/types";

const genres = ["전체", "액션", "판타지", "로맨스", "드라마", "이세계", "무협"];

export default function ExplorePage({ type }: { type: WorkType }) {
  const { state } = useAllbluState();
  const [tab, setTab] = useState(type === "anime" ? "recommend" : "ongoing");
  const [genre, setGenre] = useState("전체");
  const [count, setCount] = useState(30);
  const userStatuses = state.currentUserId ? state.workStatuses[state.currentUserId] ?? {} : {};
  const all = worksByType(type);
  const filtered = useMemo(
    () => all.filter((work) => genre === "전체" || work.genres.includes(genre)),
    [all, genre]
  );
  const title = type === "anime" ? "애니" : "웹툰";
  const isGrid = type === "anime" ? tab === "all" : tab === "done";

  return (
    <AppShell>
      <div className="px-6 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="mr-4 text-2xl font-black">{title}</h1>
          {(type === "anime"
            ? [
                ["recommend", "올블루추천"],
                ["all", "전체"],
              ]
            : [
                ["ongoing", "연재중"],
                ["done", "완결"],
              ]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setCount(30);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                tab === key ? "bg-navy text-white" : "bg-blueSoft text-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isGrid ? (
          <section>
            <div className="mb-4 flex flex-wrap gap-2">
              {genres.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGenre(item)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    genre === item ? "bg-navy text-white" : "bg-slate-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {filtered.slice(0, count).map((work) => (
                <WorkThumbnail
                  key={work.id}
                  work={work}
                  userId={state.currentUserId}
                  status={userStatuses[work.id]}
                />
              ))}
            </div>
            {count < filtered.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setCount((value) => value + 30)}
                  className="rounded bg-navy px-6 py-3 font-black text-white"
                >
                  30개 더 보기
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-5">
            <SectionCarousel
              title={type === "anime" ? "🔥 인기순위 TOP20" : "🟢 네이버 연재중"}
              works={all.slice(0, 20)}
              userId={state.currentUserId}
              statuses={userStatuses}
              rank={type === "anime"}
            />
            <SectionCarousel
              title={type === "anime" ? "✅ 완결된 애니" : "🟡 카카오 연재중"}
              works={all.slice(6, 26)}
              userId={state.currentUserId}
              statuses={userStatuses}
            />
            <SectionCarousel
              title={type === "anime" ? "✨ 2026 SS 신작 애니" : "🔥 인기 웹툰"}
              works={all.slice(12, 32)}
              userId={state.currentUserId}
              statuses={userStatuses}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
