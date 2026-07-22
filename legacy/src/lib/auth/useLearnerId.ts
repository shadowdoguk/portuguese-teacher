"use client";
import { useAuth } from "./useAuth";

/**
 * Returns the authenticated Learner ID, or null when no Learner is signed in
 * (loading or anonymous state). Use this in place of a hard-coded learnerId
 * constant — issue #105. Sites that perform per-Learner server work skip the
 * work when null; the existing UI surfaces already handle the empty case.
 */
export function useLearnerId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}
