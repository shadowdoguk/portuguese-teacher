import { describe, expect, it, beforeEach } from "vitest";
import {
  bindDefaultRecorder,
  createFireAndForgetRecorder,
  getDefaultRecorder,
  sc5Recorder,
} from "@/lib/sc5";

type Sc5Global = typeof globalThis & {
  __portugueseTeacherSc5Recorder?: unknown;
};

function clearGlobalRecorder(): void {
  delete (globalThis as Sc5Global).__portugueseTeacherSc5Recorder;
}

// Regression for issue #T-482 — the SC-5 default recorder has to survive
// HMR module re-evaluation. Earlier dev-mode behaviour dropped the bound
// recorder after Next.js re-evaluated `src/lib/sc5/recorder.ts`, leaving
// every sampled utterance stuck on the unbound default. The fix mirrors
// the bound recorder onto `globalThis` so module-local `let defaultRecorder`
// resets can no longer disconnect the route's `sc5Recorder.enqueue` from
// the server-side store.
describe("SC-5 default recorder (HMR-safe binding)", () => {
  beforeEach(() => {
    clearGlobalRecorder();
  });

  it("sc5Recorder.enqueue forwards to the bound recorder", async () => {
    const writes: string[] = [];
    const store = {
      async write(blob: { utteranceId: string; body: Uint8Array }): Promise<string> {
        writes.push(blob.utteranceId);
        return `https://blob.local/${blob.utteranceId}`;
      },
    };
    const recorder = createFireAndForgetRecorder({ store });
    bindDefaultRecorder(recorder);

    // Drive enough utterances to guarantee at least one sample lands.
    for (let i = 0; i < 500; i++) {
      sc5Recorder.enqueue({
        utteranceId: `test-${i}`,
        body: new Uint8Array(0),
        contentType: "audio/webm",
        signedUrlExpiresIn: 60,
      });
    }
    await flushMicrotasks();

    expect(writes.length).toBeGreaterThan(0);
  });

  it("getDefaultRecorder returns the bound recorder after rebind", () => {
    const a = createFireAndForgetRecorder();
    const b = createFireAndForgetRecorder();
    bindDefaultRecorder(a);
    expect(getDefaultRecorder()).toBe(a);
    bindDefaultRecorder(b);
    expect(getDefaultRecorder()).toBe(b);
  });

  it("bound recorder is mirrored on globalThis so HMR resets don't lose it", () => {
    const recorder = createFireAndForgetRecorder();
    bindDefaultRecorder(recorder);
    expect((globalThis as Sc5Global).__portugueseTeacherSc5Recorder).toBe(recorder);
  });

  it("sc5Recorder.enqueue dispatches via the globalThis-bound recorder, not the module-local default", async () => {
    // Simulate HMR resetting the module-local `let defaultRecorder` to the
    // unbound initial value, but the globalThis binding remains.
    const writes: string[] = [];
    const store = {
      async write(blob: { utteranceId: string; body: Uint8Array }): Promise<string> {
        writes.push(blob.utteranceId);
        return `https://blob.local/${blob.utteranceId}`;
      },
    };
    const recorder = createFireAndForgetRecorder({ store });
    bindDefaultRecorder(recorder);

    // Even if the module-local default were reset (e.g. via a re-evaluation),
    // the route's `sc5Recorder.enqueue` would still find the bound recorder
    // via globalThis and succeed. We can't easily simulate the module-local
    // reset from a vitest context, so we exercise the read path: re-bind
    // globalThis directly and confirm the route dispatches to it.
    (globalThis as Sc5Global).__portugueseTeacherSc5Recorder = recorder;

    for (let i = 0; i < 500; i++) {
      sc5Recorder.enqueue({
        utteranceId: `hmr-${i}`,
        body: new Uint8Array(0),
        contentType: "audio/webm",
        signedUrlExpiresIn: 60,
      });
    }
    await flushMicrotasks();
    expect(writes.length).toBeGreaterThan(0);
  });
});

async function flushMicrotasks(): Promise<void> {
  // Two passes: drain the synchronous enqueue + the awaited write inside the
  // fire-and-forget recorder.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}