// Audio schemas — shared by @pt/api and @pt/web.
//
// `AudioSynthesisAdapter` is the Phase A tooling-interface (CONTEXT.md
// "Provider Adapter"); Phase A ships an in-memory stub, Phase C wires
// Azure pt-PT (primary) + Polly `Inês` (fallback) + MiniMax (only if
// a dedicated European Portuguese evaluation passes). The contract
// here defines the boundary — concrete implementations live in
// `apps/api/src/providers/audio/` and are not part of @pt/contracts.
//
// `AudioAsset` rows are content-addressed (`aud_<sha256[:16]>`) so
// identical inputs across CVs dedupe to one row. Phase A leaves the
// table empty (CONTEXT.md "Pre-Phase C Audio"); Phase C back-fills.

import { z } from 'zod';

// ---------- AudioAsset --------------------------------------------------

/** `aud_<16-hex>` content-addressed audio asset ID. */
export const audioIdSchema = z.string().regex(/^aud_[0-9a-f]{16}$/);

export const audioVoiceSchema = z.enum([
  // Phase A stubs — used only by the in-memory adapter.
  'stub:pt-PT:default',
  // Phase C candidates. Adapter dispatches on these.
  'azure:pt-PT:default',
  'polly:Ines',
  'minimax:pt-PT:default',
]);

export type AudioVoice = z.infer<typeof audioVoiceSchema>;

export const audioAssetSchema = z.object({
  audioId: audioIdSchema,
  /** SHA-256 of `(voice, text, audioSettings.speed)` — content address. */
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  voice: audioVoiceSchema,
  /** Plain-text synthesis input. */
  text: z.string().min(1),
  /** 0.5–2× playback speed (mirrors Settings.audioSpeed). */
  speed: z.number().min(0.5).max(2),
  /** Bytes — opaque to clients; server stores / serves. */
  bytes: z.instanceof(Uint8Array).or(z.string()),
  /** ISO-8601 creation timestamp. */
  createdAt: z.string().datetime(),
});

export type AudioAsset = z.infer<typeof audioAssetSchema>;

// ---------- Synthesis request / response --------------------------------

/** Input for `POST /api/audio/synthesize` (Phase C adds the route). */
export const synthesisRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  voice: audioVoiceSchema.default('stub:pt-PT:default'),
  speed: z.number().min(0.5).max(2).default(1),
});

export type SynthesisRequest = z.infer<typeof synthesisRequestSchema>;

export const synthesisResponseSchema = z.object({
  audioId: audioIdSchema,
  voice: audioVoiceSchema,
  /** Opaque, client-side playable URL (e.g. `/api/audio/:id`). */
  url: z.string(),
});

export type SynthesisResponse = z.infer<typeof synthesisResponseSchema>;

// ---------- Adapter interface shape -------------------------------------

/**
 * Structural type for the `AudioSynthesisAdapter` port. Phase A ships
 * an in-memory stub implementing this; Phase C wires the real
 * providers. The interface is Zod-described so callers can validate
 * runtime payloads against the contract before dispatch.
 */
export const audioAdapterInterfaceSchema = z.object({
  /** Stable provider id — for logging / metrics only. */
  providerId: z.string(),
  /** Voice catalogue the adapter can serve. */
  voices: z.array(audioVoiceSchema),
  /** Synthesis entry-point. The implementation lives outside @pt/contracts. */
  synthesize: z.function(),
});

export type AudioAdapterInterface = z.infer<typeof audioAdapterInterfaceSchema>;
