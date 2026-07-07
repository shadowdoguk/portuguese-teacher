import type { ReactElement, ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import type { Level } from "@/lib/auth/types";

const STORAGE_KEY = "portuguese-teacher:user";

export type SeedLearnerInput = {
  id: string;
  level?: Level;
};

/**
 * Seeds `localStorage` with a minimal Learner record so AuthProvider hydrates
 * into the `authenticated` state on the next render.
 */
export function seedLearner({ id, level = "A0" }: SeedLearnerInput): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      id,
      name: "Test Learner",
      email: "test@example.com",
      dialect: "pt-PT",
      level,
      streakDays: 0,
      weeklyMinutes: 0,
      createdAt: "2026-07-01T00:00:00.000Z",
    }),
  );
}

/**
 * Clears `localStorage` so AuthProvider hydrates into the `anonymous` state.
 */
export function clearLearner(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Wraps a node in `<AuthProvider>` so the test can call hooks like
 * `useLearnerId` or `useAuth`.
 */
export function withAuth(node: ReactNode): ReactElement {
  return <AuthProvider>{node}</AuthProvider>;
}
