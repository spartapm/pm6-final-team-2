"use client";

import { useEffect, useState } from "react";
import CarouselNavButton from "./CarouselNavButton";
import SectionHeading from "./SectionHeading";
import WorkThumbnail from "./WorkThumbnail";
import type { WorkRatingStats } from "@/lib/ratings";
import type { Work, WorkStatus } from "@/lib/types";

export default function SectionCarousel({
  title,
  icon,
  works,
  userId,
  statuses = {},
  ratingStats,
  rank = false,
  pageSize = 6,
  tabs,
  activeTab,
  onTabChange,
  tabStyle = "pipe",
}: {
  title: string;
  icon?: string;
  works: Work[];
  userId?: string;
  statuses?: Record<string, WorkStatus>;
  ratingStats?: Map<string, WorkRatingStats>;
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
        <SectionHeading title={title} icon={icon} />
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
        <CarouselNavButton
          direction="left"
          label="이전"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        />

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 md:gap-4">
          {visible.map((work, index) => (
            <WorkThumbnail
              key={work.id}
              work={work}
              userId={userId}
              status={statuses[work.id]}
              averageRating={ratingStats?.get(work.id)?.average ?? 0}
              rank={rank ? page * pageSize + index + 1 : undefined}
              compact
            />
          ))}
        </div>

        <CarouselNavButton
          direction="right"
          label="다음"
          disabled={page >= pages - 1}
          onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
        />
      </div>
    </section>
  );
}
