"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PickCard from "@/components/PickCard";
import { addPick } from "@/lib/store";
import { useAllbluState } from "@/lib/useAllbluState";
import { getWork, works } from "@/lib/works";

export default function OllpickPage() {
  const router = useRouter();
  const { state } = useAllbluState();
  const [baseWorkId, setBaseWorkId] = useState("");
  const [recommendedWorkId, setRecommendedWorkId] = useState("");
  const [reason, setReason] = useState("");
  const user = state.users.find((item) => item.id === state.currentUserId);
  const watchedWorks = useMemo(() => {
    if (!user) return [];
    const statuses = state.workStatuses[user.id] ?? {};
    return works.filter((work) => ["WATCHING", "DONE"].includes(statuses[work.id]));
  }, [state.workStatuses, user]);

  const submit = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!baseWorkId || !recommendedWorkId || reason.length < 10 || reason.length > 200) {
      alert("추천 이유는 10자 이상 200자 이하로 작성해주세요.");
      return;
    }
    addPick({ baseWorkId, recommendedWorkId, reason });
    setReason("");
  };

  return (
    <AppShell>
      <div className="px-6 py-6">
        <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black">올블픽 유저추천</h1>
          <p className="mt-2 text-muted">본 작품을 기준으로 어울리는 애니와 웹툰을 추천해보세요.</p>
        </section>

        <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black">내 추천 작성하기</h2>
          {watchedWorks.length ? (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
              <SelectWork value={baseWorkId} onChange={setBaseWorkId} works={watchedWorks} placeholder="메인 작품" />
              <SelectWork value={recommendedWorkId} onChange={setRecommendedWorkId} works={watchedWorks} placeholder="추천할 작품" />
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="추천 이유를 10자 이상 작성"
                className="rounded-lg border border-line px-3 py-2"
              />
              <button type="button" onClick={submit} className="rounded bg-navy px-5 py-2 font-black text-white">
                투고
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-blueSoft p-5 text-center">
              <p className="font-bold">본 작품이 아직 없어요.</p>
              <button type="button" onClick={() => router.push("/")} className="mt-3 rounded bg-navy px-5 py-2 font-black text-white">
                본 작품 등록하러 가기
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black">최신 반영 추천</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {state.picks.map((pick) => (
              <PickCard key={pick.id} pick={pick} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SelectWork({
  value,
  onChange,
  works: options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  works: typeof works;
  placeholder: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-line px-3 py-2">
      <option value="">{placeholder}</option>
      {options.map((work) => (
        <option key={work.id} value={work.id}>
          {getWork(work.id)?.title}
        </option>
      ))}
    </select>
  );
}
