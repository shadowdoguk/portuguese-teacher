import { useCallback } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { recordLessonProgress } from "./progress";

/**
 * React hook exposing the per-Learner progress writer surface used by
 * LessonPlayer (and any future "completion event" surface — SRS grade,
 * scenario completion, etc.).
 *
 * `onLessonComplete` fires the increment + streak update against the
 * authenticated Learner via AuthProvider.patchUser, which persists back
 * to the `portuguese-teacher:user` localStorage entry. All consumers
 * (Dashboard tiles, /profile, etc.) re-render with the updated shape.
 *
 * Idempotent per mount: the hook binds a stable callback. LessonPlayer
 * is responsible for de-duplicating "lesson completion" events within
 * a session — typically via a `useRef` guard or a once-per-mount effect.
 */
export function useLearnerProgress() {
  const { user, patchUser } = useAuth();

  const onLessonComplete = useCallback(
    (incrementMinutes: number) => {
      if (!user) return;
      const next = recordLessonProgress(user, incrementMinutes);
      if (next === user) return; // no-op (e.g., negative increment)
      patchUser({
        weeklyMinutes: next.weeklyMinutes,
        streakDays: next.streakDays,
      });
    },
    [user, patchUser],
  );

  return { onLessonComplete };
}
