"use client";

/**
 * Compatibility facade — mutations live in auth.ts / db.ts (Supabase).
 * Prefer importing from those modules directly in new code.
 */

export { signIn as login, signUp as signup, signOut as logout, getSessionUser as currentUser } from "./auth";
export {
  setWorkStatus,
  toggleWorkStatus,
  addReview,
  updateReview,
  deleteReview,
  likeReview,
  hasLikedReview,
  addPick,
  agreePick,
  deleteMyPickReason,
  updateBio,
  toggleFollow,
  isFollowing,
  getFollowerCount,
  getFollowingCount,
  listFollowers,
  listFollowing,
} from "./db";
export type { FollowListUser } from "./db";
export { fetchProfile } from "./auth";
