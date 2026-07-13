"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Logo from "@/components/Logo";
import { signIn } from "@/lib/auth";
import { useAllbluState } from "@/lib/useAllbluState";

export default function LoginPage() {
  const router = useRouter();
  const { state, ready } = useAllbluState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 상태면 로그인 폼·세션 덮어쓰기 방지
  useEffect(() => {
    if (ready && state.currentUserId) {
      router.replace("/");
    }
  }, [ready, state.currentUserId, router]);

  const submit = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace("/");
  };

  if (!ready || state.currentUserId) {
    return (
      <AppShell>
        <div className="px-6 py-16 text-center text-sm text-muted">이동 중…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="flex min-h-[620px] items-center justify-center px-6 py-14">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" href={null} />
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <label className="auth-input-row border-b border-line">
              <UserFieldIcon />
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                type="email"
                placeholder="이메일"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                autoComplete="email"
              />
            </label>
            <label className="auth-input-row">
              <LockFieldIcon />
              <input
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                type="password"
                placeholder="비밀번호"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-[12px] leading-5 text-red-500">{error}</p> : null}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="btn-primary mt-5 h-12 w-full text-[15px] disabled:opacity-60"
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>

          <p className="mt-4 text-center text-sm text-muted">
            아직 회원이 아니신가요?{" "}
            <Link className="font-black text-ink" href="/signup">
              회원가입
            </Link>
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function UserFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="#9ca3af" strokeWidth="1.7" />
      <path
        d="M5.5 19c1.5-3 3.8-4.5 6.5-4.5s5 1.5 6.5 4.5"
        stroke="#9ca3af"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="#9ca3af" strokeWidth="1.7" />
      <path
        d="M8 10V8a4 4 0 0 1 8 0v2"
        stroke="#9ca3af"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
