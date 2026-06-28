import type { PlacementLessonAttempt } from "@/lib/curriculum";

export class PlacementStore {
  private readonly attempts = new Map<string, PlacementLessonAttempt>();
  private readonly byLearner = new Map<string, string[]>();

  record(attempt: PlacementLessonAttempt): PlacementLessonAttempt {
    this.attempts.set(attempt.id, attempt);
    const list = this.byLearner.get(attempt.learnerId) ?? [];
    list.push(attempt.id);
    this.byLearner.set(attempt.learnerId, list);
    return attempt;
  }

  get(attemptId: string): PlacementLessonAttempt | undefined {
    return this.attempts.get(attemptId);
  }

  forLearner(learnerId: string): ReadonlyArray<PlacementLessonAttempt> {
    const ids = this.byLearner.get(learnerId) ?? [];
    return ids
      .map((id) => this.attempts.get(id))
      .filter((a): a is PlacementLessonAttempt => a !== undefined);
  }

  count(): number {
    return this.attempts.size;
  }

  clear(): void {
    this.attempts.clear();
    this.byLearner.clear();
  }
}

let sharedStore: PlacementStore | undefined;

export function getPlacementStore(): PlacementStore {
  if (!sharedStore) {
    sharedStore = new PlacementStore();
  }
  return sharedStore;
}

export function resetPlacementStore(): void {
  sharedStore = new PlacementStore();
}

export function newPlacementAttemptId(): string {
  return `placement-attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
