"use client";

import { useEffect, useState } from "react";
import WorkThumbnail from "./WorkThumbnail";
import type { Work, WorkStatus } from "@/lib/types";

export default function SectionCarousel({
  title,
  works,
  userId,
  statuses = {},
  rank = false,
  pageSize = 6,
  tabs,
  activeTab,
  onTabChange,
  tabStyle = "pipe",
}: {
  title: string;
  works: Work[];
  userId?: string;
  statuses?: Record<string, WorkStatus>;
  rank?: boolean;
  pageSize?: number;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  tabStyle?: "pipe" | "underline";
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(works.length / pageSize));
  const visible = works.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [works, pageSize, activeTab]);

  return (
    <section className="section-card">
      <div className="mb-4">
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        {tabs ? (
          tabStyle === "underline" ? (
            <div className="mt-3 flex items-center gap-5 text-sm font-bold">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onTabChange?.(tab.id);
                      setPage(0);
                    }}
                    className={`relative pb-2 transition ${
                      active ? "text-brand" : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    {active ? (
                      <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3 text-sm font-bold text-muted">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onTabChange?.(tab.id);
                    setPage(0);
                  }}
                  className={activeTab === tab.id ? "text-ink" : "hover:text-ink"}
                >
                  {index > 0 ? <span className="mr-3 text-line">|</span> : null}
                  {tab.label}
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <CarouselButton
          label="이전"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        >
          ‹
        </CarouselButton>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 md:gap-4">
          {visible.map((work, index) => (
            <WorkThumbnail
              key={work.id}
              work={work}
              userId={userId}
              status={statuses[work.id]}
              rank={rank ? page * pageSize + index + 1 : undefined}
              compact
            />
          ))}
        </div>

        <CarouselButton
          label="다음"
          disabled={page >= pages - 1}
          onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
        >
          ›
        </CarouselButton>
      </div>
    </section>
  );
}

function CarouselButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-xl text-muted transition hover:bg-search disabled:opacity-30 sm:flex"
    >
      {children}
    </button>
  );
}
