import { DEFAULT_SETTINGS, type Settings } from "./types";
import type { Learner } from "@/lib/auth/types";

export type ExportPayload = {
  schema: "portuguese-teacher/export";
  schemaVersion: 1;
  exportedAt: string;
  learner: Learner;
  settings: Settings;
  attempts?: unknown[];
  referrals?: unknown[];
  deletionRequested?: { requestedAt: string; completesBy: string } | null;
};

export function buildExportPayload(input: {
  learner: Learner;
  settings: Settings;
  attempts?: unknown[];
  referrals?: unknown[];
  deletionRequested?: ExportPayload["deletionRequested"];
  now?: Date;
}): ExportPayload {
  const now = input.now ?? new Date();
  return {
    schema: "portuguese-teacher/export",
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    learner: input.learner,
    settings: input.settings,
    attempts: input.attempts,
    referrals: input.referrals,
    deletionRequested: input.deletionRequested ?? null,
  };
}

export function exportPayloadAsString(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function exportFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `portuguese-teacher-export-${stamp}.json`;
}

export { DEFAULT_SETTINGS };
