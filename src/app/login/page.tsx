"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { login } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!id || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    const result = login(id, password);
    if (!result.ok) {
      setError(result.message ?? "로그인에 실패했습니다.");
      return;
    }
    router.push("/");
  };

  return (
    <AppShell>
      <AuthPanel>
        <input
          value={id}
          onChange={(event) => setId(event.target.value)}
          placeholder="아이디"
          className="w-full border-b border-ink px-1 py-3 outline-none"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="비밀번호"
          className="mt-3 w-full border-b border-ink px-1 py-3 outline-none"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <button type="button" onClick={submit} className="mt-6 h-11 w-full rounded bg-navy font-black text-white">
          로그인
        </button>
        <p className="mt-3 text-center text-sm">
          계정이 없나요?{" "}
          <Link className="font-bold text-navy underline" href="/signup">
            회원가입
          </Link>
        </p>
      </AuthPanel>
    </AppShell>
  );
}

function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-[540px] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blueSoft font-black text-navy">
            all
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
