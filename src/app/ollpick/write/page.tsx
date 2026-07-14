"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { showLoginRequired, showToast } from "@/components/Toast";
import WorkCoverImage from "@/components/WorkCoverImage";
import { addPick } from "@/lib/store";
import {
  trackAppError,
  trackRecommendWriteStart,
  trackRecommendWriteSubmit,
} from "@/lib/analytics";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";
import type { Work, WorkStatus } from "@/lib/types";

const STATUS_LABEL: Record<WorkStatus, string> = {
  KEEP: "볼 예정",
  WATCHING: "보는중",
  DONE: "완료",
  STOPPED: "중단",
};

function WritePickPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, ready, worksRevision } = useAllbluState();

  const user = state.users.find((item) => item.id === state.currentUserId);
  const statuses = user ? state.workStatuses[user.id] ?? {} : {};

  const watchedWorks = useMemo(() => {
    if (!user) return [];
    return works.filter((work) => ["WATCHING", "DONE"].includes(statuses[work.id] ?? ""));
  }, [statuses, user, worksRevision]);

  const [baseWorkId, setBaseWorkId] = useState("");
  const [recommendedWorkId, setRecommendedWorkId] = useState("");
  const [reason, setReason] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const writeStartSent = useRef(false);

  useEffect(() => {
    if (!ready || hydrated) return;
    const base = searchParams.get("base") ?? "";
    const recommended = searchParams.get("recommended") ?? "";
    if (base && watchedWorks.some((work) => work.id === base)) setBaseWorkId(base);
    if (recommended && watchedWorks.some((work) => work.id === recommended)) {
      setRecommendedWorkId(recommended);
    }
    setHydrated(true);
  }, [ready, hydrated, searchParams, watchedWorks]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      showLoginRequired("recommend_write");
      router.replace("/login");
      return;
    }
    if (hydrated && watchedWorks.length === 0) {
      showToast("본 작품(보는중/완료)을 먼저 등록해주세요");
      router.replace("/ollpick");
      return;
    }
    if (user && hydrated && watchedWorks.length > 0 && !writeStartSent.current) {
      writeStartSent.current = true;
      trackRecommendWriteStart();
    }
  }, [ready, user, hydrated, watchedWorks.length, router]);

  const baseWork = baseWorkId ? getWork(baseWorkId) : undefined;
  const recommendedWork = recommendedWorkId ? getWork(recommendedWorkId) : undefined;
  const cancelHref = baseWorkId ? `/ollpick/${baseWorkId}` : "/ollpick";

  const save = async () => {
    if (!user) {
      showLoginRequired("recommend_write");
      return;
    }
    if (!baseWorkId || !recommendedWorkId) {
      alert("메인 작품과 추천할 작품을 선택해주세요.");
      return;
    }
    if (baseWorkId === recommendedWorkId) {
      alert("서로 다른 작품을 선택해주세요.");
      return;
    }
    if (reason.trim().length < 10 || reason.length > 200) {
      alert("추천 이유는 10자 이상 200자 이하로 작성해주세요.");
      return;
    }
    const reasonLength = reason.trim().length;
    const result = await addPick({
      baseWorkId,
      recommendedWorkId,
      reason: reason.trim(),
      userId: user.id,
      nickname: user.nickname,
    });
    if (!result.ok) {
      alert(result.message);
      trackAppError({ errorType: "write_submit_fail", pageName: "ollpick_write" });
      return;
    }
    trackRecommendWriteSubmit({
      baseWorkId,
      recommendedWorkId,
      reasonLength,
      isDuplicatePair: result.isDuplicatePair,
    });
    router.push(`/ollpick/${baseWorkId}`);
  };

  if (!ready || !user) {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-sm text-muted">불러오는 중…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 md:p-8">
          <h1 className="mb-8 text-2xl font-black tracking-tight">+ 내 추천 작성하기</h1>

          <div className="space-y-8">
            <WorkSearchField
              step="①"
              label="메인 작품"
              hint="(보는중·완료 작품만 검색 가능)"
              works={watchedWorks}
              statuses={statuses}
              selectedId={baseWorkId}
              excludeId={recommendedWorkId}
              onSelect={setBaseWorkId}
              onClear={() => setBaseWorkId("")}
            />

            <WorkSearchField
              step="②"
              label="추천할 작품"
              hint="(보는중·완료 작품만 선택 가능)"
              works={watchedWorks}
              statuses={statuses}
              selectedId={recommendedWorkId}
              excludeId={baseWorkId}
              onSelect={setRecommendedWorkId}
              onClear={() => setRecommendedWorkId("")}
            />

            <div>
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <h2 className="text-base font-black">③ 추천 이유</h2>
                <span className="text-xs font-bold text-muted">(10자 이상 200자 이하)</span>
              </div>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, 200))}
                placeholder="왜 이 작품을 추천하는지 적어주세요 (10자 이상)"
                className="min-h-[160px] w-full resize-none rounded-xl border border-line bg-surface/40 p-4 text-sm leading-relaxed outline-none focus:border-brand focus:bg-white"
              />
              <p className="mt-2 text-right text-xs font-bold text-muted">{reason.length}/200</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href={cancelHref}
              className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-bold text-ink"
            >
              취소
            </Link>
            <button
              type="button"
              onClick={() => void save()}
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white"
            >
              저장
            </button>
          </div>

          {baseWork && recommendedWork ? (
            <p className="mt-4 text-center text-xs text-muted">
              {baseWork.title} → {recommendedWork.title} 추천을 등록합니다.
            </p>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

/**
 * 검색 박스 클릭/포커스 시 드롭다운 노출.
 * 목록 = 보는중·완료 작품만. 항목: 썸네일·제목·타입·상태 뱃지.
 */
function WorkSearchField({
  step,
  label,
  hint,
  works: options,
  statuses,
  selectedId,
  excludeId,
  onSelect,
  onClear,
}: {
  step: string;
  label: string;
  hint: string;
  works: Work[];
  statuses: Record<string, WorkStatus>;
  selectedId: string;
  excludeId?: string;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = selectedId ? getWork(selectedId) : undefined;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return options
      .filter((work) => work.id !== excludeId)
      .filter((work) => !normalized || work.title.toLowerCase().includes(normalized));
  }, [excludeId, options, query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const pickWork = (id: string) => {
    onSelect(id);
    setQuery("");
    setOpen(false);
  };

  const pickFirstMatch = () => {
    const first = filtered[0];
    if (!first) {
      alert("선택 가능한 작품이 없습니다. 보는중/완료 작품을 등록해주세요.");
      return;
    }
    pickWork(first.id);
  };

  return (
    <div ref={rootRef}>
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h2 className="text-base font-black">
          {step} {label}
        </h2>
        <span className="text-xs font-bold text-muted">{hint}</span>
      </div>

      <div className="relative flex gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface/50 px-4 py-3 text-left transition hover:border-brand focus-within:border-brand focus-within:bg-white"
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            placeholder="작품명을 검색하세요"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            if (query.trim()) pickFirstMatch();
            else inputRef.current?.focus();
          }}
          className="shrink-0 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink hover:bg-surface"
        >
          선택
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-line bg-white shadow-menu">
            {filtered.length ? (
              filtered.map((work) => {
                const status = statuses[work.id];
                return (
                  <button
                    key={work.id}
                    type="button"
                    onClick={() => pickWork(work.id)}
                    className="flex w-full items-center gap-3 border-b border-line/70 px-3 py-2.5 text-left last:border-0 hover:bg-blueSoft"
                  >
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
                      <WorkCoverImage src={work.thumbnailUrl} alt={work.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-bold">{work.title}</p>
                      <p className="text-[11px] font-bold text-muted">
                        {work.type === "anime" ? "애니" : "웹툰"}
                      </p>
                    </div>
                    {status ? <StatusBadge status={status} /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-4 text-sm text-muted">
                {options.length === 0
                  ? "보는중·완료 작품이 없습니다."
                  : "검색 결과가 없습니다."}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-blueSoft/60 p-3">
          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
            <WorkCoverImage src={selected.thumbnailUrl} alt={selected.title} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-black">{selected.title}</p>
            <p className="mt-0.5 text-xs font-bold text-muted">
              {statuses[selected.id]
                ? `${STATUS_LABEL[statuses[selected.id]]} 상태`
                : "선택됨"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-sm font-bold text-muted hover:text-ink"
            aria-label="선택 해제"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: WorkStatus }) {
  const isActive = status === "DONE" || status === "WATCHING";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-blueSoft text-brand"
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function WritePickPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="px-6 py-16 text-center text-sm text-muted">불러오는 중…</div>
        </AppShell>
      }
    >
      <WritePickPageInner />
    </Suspense>
  );
}
