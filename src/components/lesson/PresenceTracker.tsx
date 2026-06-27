"use client";

import { useDocumentVisibilityTracker } from "@/lib/affective";

export function PresenceTracker() {
  useDocumentVisibilityTracker();
  return null;
}
