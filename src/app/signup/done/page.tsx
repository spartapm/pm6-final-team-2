"use client";

import Link from "next/link";
import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import Logo from "@/components/Logo";
import { clearLocalSession, setForceGuest } from "@/lib/auth";

/**
 * 회원가입 완료 화면.
 * - 자동 로그인 없음
 * - 「로그인」버튼으로만 로그인 페이지 이동
 */
export default function SignupDonePage() {
  useEffect(() => {
    setForceGuest(true);
    void clearLocalSession().finally(() => {
      setForceGuest(true);
      window.dispatchEvent(new Event("allblu-state-change"));
    });
  }, []);

  return (
    <AppShell>
      <section className="flex min-h-[620px] items-center justify-center px-6 py-14 text-center">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" href={null} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">회원가입 완료!</h1>
          <p className="mt-3 text-sm text-muted">로그인 해주세요</p>
          <Link href="/login" className="btn-primary mt-8 inline-flex h-12 w-full text-[15px]">
            로그인
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
