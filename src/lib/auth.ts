"use client";

import { supabase, supabaseConfigured } from "./supabase";
import type { User } from "./types";

export type AuthResult = { ok: true; user?: User } | { ok: false; message: string };

/** 회원가입 직후~명시적 로그인 전까지 세션을 무시 (자동로그인 방지) */
export const FORCE_GUEST_KEY = "allblu_force_guest";

export function setForceGuest(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) sessionStorage.setItem(FORCE_GUEST_KEY, "1");
  else sessionStorage.removeItem(FORCE_GUEST_KEY);
}

export function isForceGuest() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(FORCE_GUEST_KEY) === "1";
}

function mapAuthError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (message.includes("Password should be")) {
    return "비밀번호가 너무 짧습니다.";
  }
  if (message.toLowerCase().includes("nickname") || message.includes("duplicate key")) {
    return "중복된 닉네임 입니다.";
  }
  return message || "요청을 처리하지 못했습니다.";
}

export async function fetchProfile(userId: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, nickname, bio, badge")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return undefined;
  return {
    id: data.user_id as string,
    email: data.email as string,
    nickname: data.nickname as string,
    bio: (data.bio as string) ?? "",
    badge: (data.badge as string) ?? "올블루 스타터",
  };
}

export async function getSessionUser(): Promise<User | undefined> {
  if (!supabaseConfigured) return undefined;
  // 가입 완료 후 로그인 유도 구간: 잔여 세션이 있어도 비회원으로 취급
  if (isForceGuest()) return undefined;
  const { data } = await supabase.auth.getSession();
  const sessionUser = data.session?.user;
  if (!sessionUser) return undefined;
  const profile = await fetchProfile(sessionUser.id);
  if (profile) return profile;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    nickname:
      (sessionUser.user_metadata?.nickname as string | undefined) ??
      sessionUser.email?.split("@")[0] ??
      "유저",
    bio: "",
    badge: "올블루 스타터",
  };
}

/** 로컬 세션만 제거 (force-guest 플래그는 유지) */
export async function clearLocalSession() {
  if (!supabaseConfigured) return;
  await supabase.auth.signOut({ scope: "local" });
  for (let i = 0; i < 5; i += 1) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase.auth.signOut({ scope: "local" });
  }
}

export async function signUp(
  email: string,
  password: string,
  nickname: string
): Promise<AuthResult> {
  if (!supabaseConfigured) {
    return { ok: false, message: "Supabase가 설정되지 않았습니다." };
  }
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedNick = nickname.trim();
  if (!trimmedEmail || !password || !trimmedNick) {
    return { ok: false, message: "모든 값을 입력해주세요." };
  }
  if (password.length > 20) {
    return { ok: false, message: "비밀번호는 20자 이하로 작성해주세요." };
  }
  if (password.length < 6) {
    return { ok: false, message: "비밀번호는 6자 이상이어야 합니다." };
  }

  const { data: nickHit } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("nickname", trimmedNick)
    .maybeSingle();
  if (nickHit) return { ok: false, message: "중복된 닉네임 입니다." };

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: { data: { nickname: trimmedNick } },
  });
  if (error) return { ok: false, message: mapAuthError(error.message) };

  // Ensure profile row (trigger may race)
  if (data.user) {
    await supabase.from("profiles").upsert(
      {
        user_id: data.user.id,
        email: trimmedEmail,
        nickname: trimmedNick,
        badge: "올블루 스타터",
      },
      { onConflict: "user_id" }
    );
  }

  // AUTH-DONE: 자동 로그인 금지 — 세션 제거 + 강제 게스트
  setForceGuest(true);
  await clearLocalSession();
  window.dispatchEvent(new Event("allblu-state-change"));

  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabaseConfigured) {
    return { ok: false, message: "Supabase가 설정되지 않았습니다." };
  }
  const keepForceGuestOnFail = isForceGuest();
  // 명시적 로그인 시에만 게스트 강제 해제
  setForceGuest(false);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    if (keepForceGuestOnFail) setForceGuest(true);
    return { ok: false, message: mapAuthError(error.message) };
  }
  const user = data.user ? await fetchProfile(data.user.id) : undefined;
  window.dispatchEvent(new Event("allblu-state-change"));
  return { ok: true, user };
}

export async function signOut() {
  if (!supabaseConfigured) return;
  setForceGuest(false);
  await supabase.auth.signOut();
  window.dispatchEvent(new Event("allblu-state-change"));
}
