"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { signup } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!nickname || !id || !password) {
      setMessage("모든 값을 입력해주세요.");
      return;
    }
    const result = signup({ id, nickname, password });
    if (!result.ok) {
      setMessage(result.message ?? "회원가입에 실패했습니다.");
      return;
    }
    router.push("/signup/done");
  };

  return (
    <AppShell>
      <section className="flex min-h-[540px] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blueSoft font-black text-navy">
              all
            </div>
          </div>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="닉네임"
            className="w-full border-b border-ink px-1 py-3 outline-none"
          />
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="아이디"
            className="mt-3 w-full border-b border-ink px-1 py-3 outline-none"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="비밀번호"
            maxLength={20}
            className="mt-3 w-full border-b border-ink px-1 py-3 outline-none"
          />
          {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
          <button type="button" onClick={submit} className="mt-6 h-11 w-full rounded bg-navy font-black text-white">
            가입하기
          </button>
          <p className="mt-3 text-center text-sm">
            이미 계정이 있나요?{" "}
            <Link className="font-bold text-navy underline" href="/login">
              로그인
            </Link>
          </p>
        </div>
      </section>
    </AppShell>
  );
}
