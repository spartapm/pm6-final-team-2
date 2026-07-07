import Link from "next/link";
import AppShell from "@/components/AppShell";

export default function SignupDonePage() {
  return (
    <AppShell>
      <section className="flex min-h-[540px] items-center justify-center px-6 py-12 text-center">
        <div>
          <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-blueSoft font-black text-navy">
            all
          </div>
          <h1 className="text-2xl font-black">회원가입 완료!</h1>
          <p className="mt-4 text-muted">로그인 페이지에서 로그인 해주세요</p>
          <Link href="/login" className="mx-auto mt-8 block w-40 rounded bg-navy px-6 py-3 font-black text-white">
            로그인
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
