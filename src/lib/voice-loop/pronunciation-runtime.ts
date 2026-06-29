import {
  buildCalibrationOffset,
  CALIBRATION_REFERENCES,
} from "./pronunciation-calibration";
import type {
  MiniMaxPronunciation,
  MockMiniMaxPronunciation,
} from "@/lib/minimax";
import type { PronunciationScoreResult } from "@/lib/minimax/types";

export type CalibrationLogger = (line: string) => void;

export type PronunciationRuntimeDeps = {
  client: MiniMaxPronunciation | MockMiniMaxPronunciation;
  logger?: CalibrationLogger;
  references?: ReadonlyArray<string>;
  now?: () => number;
};

export type PronunciationRuntimeState =
  | { status: "pending" }
  | { status: "ready"; offset: number; ranAt: number; referenceCount: number }
  | { status: "fallback"; ranAt: number; reason: string };

export class PronunciationRuntime {
  private state: PronunciationRuntimeState = { status: "pending" };
  private readonly client: MiniMaxPronunciation | MockMiniMaxPronunciation;
  private readonly logger: CalibrationLogger | undefined;
  private readonly references: ReadonlyArray<string>;
  private readonly now: () => number;
  private inflight: Promise<void> | null = null;

  constructor(deps: PronunciationRuntimeDeps) {
    this.client = deps.client;
    this.logger = deps.logger;
    this.references = deps.references ?? CALIBRATION_REFERENCES;
    this.now = deps.now ?? Date.now;
  }

  isCalibrated(): boolean {
    return this.state.status === "ready" || this.state.status === "fallback";
  }

  getOffset(): number {
    if (this.state.status === "ready") return this.state.offset;
    return 0;
  }

  getState(): PronunciationRuntimeState {
    return this.state;
  }

  ensureCalibrated(): Promise<void> {
    if (this.state.status !== "pending") return Promise.resolve();
    if (this.inflight) return this.inflight;
    this.inflight = this.runCalibration().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async runCalibration(): Promise<void> {
    const startedAt = this.now();
    const scores: number[] = [];
    let failures = 0;
    for (const reference of this.references) {
      try {
        const result: PronunciationScoreResult = await this.client.score({
          reference,
          observed: reference,
          lang: "pt-PT",
        });
        scores.push(result.score);
      } catch {
        failures += 1;
      }
    }
    if (scores.length === 0) {
      this.state = {
        status: "fallback",
        ranAt: this.now(),
        reason: `calibration failed for all ${this.references.length} references`,
      };
      this.logger?.(
        `[pronunciation] calibration fallback: ${this.state.reason}; using offset=0`,
      );
      return;
    }
    const offset = buildCalibrationOffset(scores);
    this.state = {
      status: "ready",
      offset,
      ranAt: this.now(),
      referenceCount: scores.length,
    };
    this.logger?.(
      `[pronunciation] calibration complete: refs=${scores.length}, failures=${failures}, offset=${offset}, durationMs=${this.now() - startedAt}`,
    );
  }
}

let runtimeSingleton: PronunciationRuntime | null = null;
let runtimeDepsSignature: string | null = null;

export function getPronunciationRuntime(
  deps: PronunciationRuntimeDeps,
): PronunciationRuntime {
  const signature = `${deps.client.constructor.name}:${(deps.references ?? CALIBRATION_REFERENCES).length}`;
  if (runtimeSingleton && runtimeDepsSignature === signature) {
    return runtimeSingleton;
  }
  runtimeSingleton = new PronunciationRuntime(deps);
  runtimeDepsSignature = signature;
  return runtimeSingleton;
}

export function resetPronunciationRuntimeForTests(): void {
  runtimeSingleton = null;
  runtimeDepsSignature = null;
}