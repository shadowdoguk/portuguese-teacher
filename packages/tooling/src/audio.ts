// Audio synthesis adapter — interface (port) and in-memory stub.
//
// Phase A ships only the stub. Phase C swaps in Azure pt-PT (primary),
// Polly `Inês` (fallback), MiniMax (only if a dedicated European
// Portuguese evaluation passes). The selection is driven by env at
// boot time (see packages/tooling/src/index.ts).
//
// The stub is content-addressed: two synth requests with the same
// (voice, text, speed) return the same `audioId` and re-use the
// stored bytes. Real providers will dedupe the same way via the
// contentHash.

import { createHash } from 'node:crypto';
import { audioIdSchema, audioVoiceSchema, synthesisRequestSchema, type AudioAdapterInterface, type AudioVoice, type SynthesisRequest, type SynthesisResponse } from '@pt/contracts';

export interface AudioSynthesisAdapter extends Omit<AudioAdapterInterface, 'voices'> {
  /** Returns the stub's `audioId` for the given input; provider-bound for real adapters. */
  providerId: 'stub:pt-PT:memory';
  /** Voice catalogue the adapter can serve. Widened to `readonly`
   *  so concrete adapters can expose immutable arrays without
   *  losing assignability to the Zod-inferred `AudioAdapterInterface`
   *  shape (the schema's inferred `voices` is `AudioVoice[]`, but
   *  the local interface accepts `ReadonlyArray<AudioVoice>`, which
   *  is a subtype). */
  readonly voices: ReadonlyArray<AudioVoice>;
  /** Synthesis entry-point. */
  synthesize(input: SynthesisRequest): Promise<SynthesisResponse>;
}

/** Compute the content hash per CONTEXT.md "AudioAsset" — sha256(voice|text|speed). */
export function audioContentHash(voice: AudioVoice, text: string, speed: number): string {
  return createHash('sha256').update(`${voice}|${text}|${speed.toFixed(3)}`).digest('hex');
}

/** Stub implementation: deterministic bytes per content hash; bytes are the input text re-encoded. */
export class InMemoryAudioAdapter implements AudioSynthesisAdapter {
  readonly providerId = 'stub:pt-PT:memory' as const;
  readonly voices = audioVoiceSchema.options as ReadonlyArray<AudioVoice>;
  private readonly cache = new Map<string, Uint8Array>();

  async synthesize(input: SynthesisRequest): Promise<SynthesisResponse> {
    const parsed = synthesisRequestSchema.parse(input);
    const hash = audioContentHash(parsed.voice, parsed.text, parsed.speed);
    if (!this.cache.has(hash)) {
      // Stub bytes: a UTF-8 tag with the content hash — meaningful enough
      // to verify content-addressing in tests, but explicitly NOT real audio.
      const tag = `[stub-audio ${hash.slice(0, 8)} ${parsed.voice} speed=${parsed.speed}] ${parsed.text}`;
      this.cache.set(hash, new TextEncoder().encode(tag));
    }
    return {
      audioId: audioIdSchema.parse(`aud_${hash.slice(0, 16)}`),
      voice: parsed.voice,
      url: `/api/audio/stub/${hash.slice(0, 16)}`,
    };
  }

  /** Test helper: how many synthesised clips the stub holds. */
  cacheSize(): number {
    return this.cache.size;
  }

  /** Test helper: read the stub bytes for a given content hash. */
  readCached(hash: string): Uint8Array | undefined {
    return this.cache.get(hash);
  }
}

export const defaultAudioAdapter: AudioSynthesisAdapter = new InMemoryAudioAdapter();