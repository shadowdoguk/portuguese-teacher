/**
 * Asset-URL helpers for the SRS review card.
 *
 * Audio assets are produced by `pnpm assets:tts` (the build-time TTS pipeline
 * from #25) and live at `/assets/tts/{unitId}/{assetId}.mp3`. Image assets
 * are deferred until the image-pipeline lands (no v1 surface); for now we
 * route through the same `/assets/img/{unitId}/{assetId}.svg` shape so the
 * call site stays stable when the pipeline arrives.
 */
const AUDIO_BASE = "/assets/tts";
const IMAGE_BASE = "/assets/img";

export function audioUrlFor(ref: { audioAssetId?: string; unitId: string }): string | null {
  if (!ref.audioAssetId) return null;
  return `${AUDIO_BASE}/${ref.unitId}/${ref.audioAssetId}.mp3`;
}

export function imageUrlFor(ref: { imageAssetId?: string; unitId: string }): string | null {
  if (!ref.imageAssetId) return null;
  return `${IMAGE_BASE}/${ref.unitId}/${ref.imageAssetId}.svg`;
}

export type ReviewMedia = {
  audioUrl: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

export function mediaFor(
  ref: { audioAssetId?: string; imageAssetId?: string; unitId: string; pt: string; gloss: string },
): ReviewMedia {
  return {
    audioUrl: audioUrlFor(ref),
    imageUrl: imageUrlFor(ref),
    imageAlt: `${ref.pt} — ${ref.gloss}`,
  };
}