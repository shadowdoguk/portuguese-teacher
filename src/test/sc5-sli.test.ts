import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ObservabilityEvent,
  consoleObservabilitySink,
  resetObservabilitySink,
  setObservabilitySink,
} from "@/lib/observability/sink";
import { createFireAndForgetRecorder, type Sc5AudioObjectStore } from "@/lib/sc5/recorder";

class FakeStore implements Sc5AudioObjectStore {
  failOn?: Set<string>;
  async write(blob: { utteranceId: string; body: Uint8Array }): Promise<string> {
    if (this.failOn?.has(blob.utteranceId)) throw new Error("simulated store failure");
    return `https://blob/${blob.utteranceId}`;
  }
}

describe("SC-5 recorder — observability SLI events (issue #35)", () => {
  let captured: ObservabilityEvent[];

  beforeEach(() => {
    captured = [];
    setObservabilitySink({
      name: "capture",
      emit(event) {
        captured.push(event);
      },
      async flush() {
        /* no-op */
      },
    });
  });

  afterEach(() => {
    resetObservabilitySink();
  });

  it("emits `sc5_sample` (outcome=sampled) when the write succeeds", async () => {
    const recorder = createFireAndForgetRecorder({ store: new FakeStore() });
    // u-679 is a known sampled id (verified manually against the sampler).
    recorder.enqueue({
      utteranceId: "u-679",
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
    });
    await flush();

    const events = captured.filter((e) => e.kind === "sc5_sample");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "sc5_sample",
      outcome: "sampled",
      utteranceId: "u-679",
    });
  });

  it("emits `sc5_sample` (outcome=skipped) when the sampler rejects the id", () => {
    const recorder = createFireAndForgetRecorder({ store: new FakeStore() });
    recorder.enqueue({
      utteranceId: "u-0",
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
    });

    const events = captured.filter((e) => e.kind === "sc5_sample");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "sc5_sample",
      outcome: "skipped",
      utteranceId: "u-0",
    });
  });

  it("emits `sc5_sample` (outcome=opt-out) when the per-call optOut flag is set", () => {
    const recorder = createFireAndForgetRecorder({ store: new FakeStore() });
    // Even for a sampled id, the per-call optOut flag short-circuits the write.
    recorder.enqueue({
      utteranceId: "u-679",
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
      optOut: true,
    });

    const events = captured.filter((e) => e.kind === "sc5_sample");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "sc5_sample",
      outcome: "opt-out",
      utteranceId: "u-679",
    });
  });

  it("emits `sc5_sample` (outcome=opt-out) when the recorder was constructed with optOut=true", () => {
    const recorder = createFireAndForgetRecorder({
      store: new FakeStore(),
      optOut: true,
    });
    recorder.enqueue({
      utteranceId: "u-0",
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
    });

    const events = captured.filter((e) => e.kind === "sc5_sample");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "sc5_sample",
      outcome: "opt-out",
      utteranceId: "u-0",
    });
  });

  it("emits `sc5_sample` (outcome=failed) when the object-store write throws", async () => {
    const store = new FakeStore();
    store.failOn = new Set(["u-679"]);
    const recorder = createFireAndForgetRecorder({ store });
    recorder.enqueue({
      utteranceId: "u-679",
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
    });
    await flush();

    const events = captured.filter((e) => e.kind === "sc5_sample");
    const failed = events.filter((e) => "outcome" in e && e.outcome === "failed");
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({
      kind: "sc5_sample",
      outcome: "failed",
      utteranceId: "u-679",
    });
    expect(failed[0]).toHaveProperty("detail");
  });

  it("never throws when the observability sink is the console sink", () => {
    resetObservabilitySink();
    const recorder = createFireAndForgetRecorder({ store: new FakeStore() });
    recorder.enqueue({
      utteranceId: "u-679",
      body: new Uint8Array([1, 2, 3]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
    });
    // No assertion needed — `emit` must not throw.
    expect(consoleObservabilitySink.name).toBe("console");
  });
});

async function flush(): Promise<void> {
  // Allow the fire-and-forget write + emit cycle to settle.
  await new Promise((resolve) => setTimeout(resolve, 10));
}