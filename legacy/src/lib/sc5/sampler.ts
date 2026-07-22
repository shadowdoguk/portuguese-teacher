export const SC5_SAMPLE_RATE = 0.01;

export const SC5_RETENTION_HOURS = 24;

export const SC5_AUDIO_BLOB_TTL_SECONDS = 24 * 60 * 60;

export function shouldSample(utteranceId: string, sampleRate = SC5_SAMPLE_RATE): boolean {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;
  // FNV-1a 32-bit hash, modulo 10_000 → uniform in [0, 9999].
  // sampleRate = 0.01 → threshold 100 → ~1% of utterances qualify.
  const hash = fnv1a32(utteranceId);
  const bucket = hash % 10_000;
  const threshold = Math.max(1, Math.floor(sampleRate * 10_000));
  return bucket < threshold;
}

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type Sc5SamplingBucket = {
  utteranceId: string;
  sampled: boolean;
};

export function summariseSampling(
  utteranceIds: ReadonlyArray<string>,
  sampleRate = SC5_SAMPLE_RATE,
): { total: number; sampled: number; rate: number } {
  let sampled = 0;
  for (const id of utteranceIds) {
    if (shouldSample(id, sampleRate)) sampled++;
  }
  const total = utteranceIds.length;
  const rate = total === 0 ? 0 : sampled / total;
  return { total, sampled, rate };
}