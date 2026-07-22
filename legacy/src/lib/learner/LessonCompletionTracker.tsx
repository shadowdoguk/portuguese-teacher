"use client";

import { useEffect, useRef } from "react";
import { useLearnerProgress } from "./useLearnerProgress";

/**
 * Mounts a once-per-session "lesson complete" writer. Fires when the
 * parent reports `completed === true`. Idempotent within a single mount:
 * the writer does not double-count even if the parent's `completed`
 * toggle flips multiple times.
 *
 * The estimated minutes figure defaults to 5 (a typical authored-exercise
 * set's worth) but the parent should pass the lesson's real `estimatedMinutes`
 * so the dashboard reflects the actual session effort.
 */
export function LessonCompletionTracker({
  completed,
  estimatedMinutes = 5,
}: {
  completed: boolean;
  estimatedMinutes?: number;
}) {
  const { onLessonComplete } = useLearnerProgress();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!completed) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    onLessonComplete(estimatedMinutes);
  }, [completed, estimatedMinutes, onLessonComplete]);

  return null;
}
