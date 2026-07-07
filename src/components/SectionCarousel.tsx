"use client";

import { useState } from "react";
import WorkThumbnail from "./WorkThumbnail";
import type { Work, WorkStatus } from "@/lib/types";

export default function SectionCarousel({
  title,
  works,
  userId,
  statuses = {},
  rank = false,
}: {
  title: string;
  works: Work[];
  userId?: string;
  statuses?: Record<string, WorkStatus>;
  rank?: boolean;
}) {
  const [page, setPage] = useState(0);
  const size = 6;
  const pages = Math.max(1, Math.ceil(works.length / size));
  const visible = works.slice(page * size, page * size + size);

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="h-8 w-8 rounded-full bg-slate-100 disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
            className="h-8 w-8 rounded-full bg-slate-100 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {visible.map((work, index) => (
          <WorkThumbnail
            key={work.id}
            work={work}
            userId={userId}
            status={statuses[work.id]}
            rank={rank ? page * size + index + 1 : undefined}
            compact
          />
        ))}
      </div>
    </section>
  );
}
