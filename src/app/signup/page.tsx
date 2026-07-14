"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Logo from "@/components/Logo";
import { signUp } from "@/lib/auth";
import { useAllbluState } from "@/lib/useAllbluState";

export default function SignupPage() {
  const router = useRouter();
  const { state, ready } = useAllbluState();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  /** 가입 처리 중에는 세션 레이스로 홈 리다이렉트하지 않음 */
  const submittingRef = useRef(false);

  useEffect(() => {
    if (submittingRef.current) return;
    if (ready && state.currentUserId) {
      router.replace("/");
    }
  }, [ready, state.currentUserId, router]);

  const submit = async () => {
    if (!nickname || !email || !password) {
      setMessage("모든 값을 입력해주세요.");
      return;
    }
    if (password.length > 20) {
      setMessage("비밀번호는 20자 이하로 작성해주세요.");
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    const result = await signUp(email, password, nickname);
    setLoading(false);
    if (!result.ok) {
      submittingRef.current = false;
      setMessage(result.message);
      return;
    }
    // 완료 페이지로만 이동 (홈 리다이렉트 경로 차단)
    window.location.assign("/signup/done");
  };

  if (!ready || (state.currentUserId && !loading && !submittingRef.current)) {
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
              <BadgeFieldIcon />
              <input
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setMessage("");
                }}
                placeholder="닉네임"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </label>
            <label className="auth-input-row border-b border-line">
              <UserFieldIcon />
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
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
                  setMessage("");
                }}
                type="password"
                placeholder="비밀번호 (6~20자)"
                maxLength={20}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                autoComplete="new-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
              />
            </label>
          </div>

          {message ? (
            <p className="mt-3 text-[12px] leading-5 text-red-500">{message}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="btn-primary mt-5 h-12 w-full text-[15px] disabled:opacity-60"
          >
            {loading ? "가입 중…" : "회원가입"}
          </button>

          <p className="mt-4 text-right text-sm text-muted">
            이미 등록하셨나요?{" "}
            <Link className="font-black text-ink" href="/login">
              로그인
            </Link>
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function BadgeFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="#9ca3af" strokeWidth="1.7" />
      <path
        d="M7 20l1.2-3.2A5.2 5.2 0 0 1 12 15a5.2 5.2 0 0 1 3.8 1.8L17 20"
        stroke="#9ca3af"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 11.5V14" stroke="#9ca3af" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
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
