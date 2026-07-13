"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import UserProfilePage from "@/components/UserProfilePage";
import { useAllbluState } from "@/lib/useAllbluState";

/** 타인 마이페이지 — `/mypage/[userId]` */
export default function OtherUserMyPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { state, ready } = useAllbluState();
  const userId = params.userId;

  useEffect(() => {
    if (!ready || !userId) return;
    if (state.currentUserId && userId === state.currentUserId) {
      router.replace("/mypage");
    }
  }, [ready, userId, state.currentUserId, router]);

  return <UserProfilePage profileUserId={userId} />;
}
