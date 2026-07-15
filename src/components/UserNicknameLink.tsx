"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

/** 닉네임(·아바타)만 대상 유저 마이페이지로. 부모 카드 클릭과 분리 */
export default function UserNicknameLink({
  userId,
  className,
  children,
}: {
  userId?: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!userId) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link
      href={`/mypage/${userId}`}
      className={className}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
      }}
    >
      {children}
    </Link>
  );
}
