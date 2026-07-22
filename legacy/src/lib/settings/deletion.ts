export const DELETION_STORAGE_PREFIX = "portuguese-teacher:deletion:";
export const DELETION_WINDOW_DAYS = 30;

export type DeletionRequest = {
  requestedAt: string;
  completesBy: string;
};

export function deletionStorageKey(userId: string): string {
  return `${DELETION_STORAGE_PREFIX}${userId}`;
}

export function recordDeletionRequest(userId: string, now: Date = new Date()): DeletionRequest {
  const requestedAt = now.toISOString();
  const completesBy = new Date(
    now.getTime() + DELETION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const request: DeletionRequest = { requestedAt, completesBy };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(deletionStorageKey(userId), JSON.stringify(request));
  }
  return request;
}

export function loadDeletionRequest(userId: string): DeletionRequest | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(deletionStorageKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DeletionRequest;
    if (typeof parsed.requestedAt !== "string" || typeof parsed.completesBy !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function cancelDeletionRequest(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(deletionStorageKey(userId));
}

export function formatDeletionCountdown(completesBy: string, now: Date = new Date()): string {
  const target = new Date(completesBy).getTime();
  const ms = target - now.getTime();
  if (Number.isNaN(ms) || ms <= 0) return "scheduled";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? "" : "s"}`;
}
