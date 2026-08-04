import { describe, expect, it } from "vitest";
import {
  createFireAndForgetRecorder,
  type Sc5AudioObjectStore,
  type Sc5AudioBlob,
} from "@/lib/sc5";

class FakeStore implements Sc5AudioObjectStore {
  written: Array<{ utteranceId: string; body: Uint8Array }> = [];
  failOn?: Set<string>;
  async write(blob: { utteranceId: string; body: Uint8Array }): Promise<string> {
    if (this.failOn?.has(blob.utteranceId)) throw new Error("simulated write failure");
    this.written.push(blob);
    return `https://blob.local/${blob.utteranceId}?ttl=86400`;
  }
}

describe("SC-5 fire-and-forget recorder", () => {
  it("drops utterances that don't qualify for the 1% sample", async () => {
    const store = new FakeStore();
    const recorder = createFireAndForgetRecorder({ store });

    for (let i = 0; i < 5_000; i++) recorder.enqueue(makeBlob(`utt-${i}`));
    await flushMicrotasks();

    expect(store.written.length).toBeGreaterThan(0);
    expect(store.written.length).toBeLessThan(150);
  });

  it("write failures do not throw and are reported via onError", async () => {
    const store = new FakeStore();
    // u-679 hashes into the 1 % bucket (verified manually).
    store.failOn = new Set(["u-679"]);
    const errors: unknown[] = [];
    const recorder = createFireAndForgetRecorder({
      store,
      onError: (err) => errors.push(err),
    });

    // Force a write on the failing utterance id.
    recorder.enqueue(makeBlob("u-679"));
    await flushMicrotasks(50);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("write failures when no onError is provided are swallowed (warn-only)", async () => {
    const store = new FakeStore();
    store.failOn = new Set(["u-679"]);
    const recorder = createFireAndForgetRecorder({ store });

    // Should not throw.
    recorder.enqueue(makeBlob("u-679"));
    await flushMicrotasks();
  });
});

function makeBlob(utteranceId: string): Sc5AudioBlob {
  return {
    utteranceId,
    body: new Uint8Array([1, 2, 3, 4]),
    contentType: "audio/webm",
    signedUrlExpiresIn: 86_400,
  };
}

async function flushMicrotasks(iterations = 5): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}