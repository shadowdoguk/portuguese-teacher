"use client";

import { useEffect, useRef } from "react";
import { mediaFor, type ReviewMedia } from "@/lib/srs/media";
import type { RetrievalModeSurface } from "@/lib/settings";

export function ReviewCardMedia({
  itemRef,
  surface,
}: {
  itemRef: {
    audioAssetId?: string;
    imageAssetId?: string;
    unitId: string;
    pt: string;
    gloss: string;
  };
  surface: RetrievalModeSurface;
}) {
  const media: ReviewMedia = mediaFor(itemRef);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoplayAudio = surface.audio && media.audioUrl !== null;

  useEffect(() => {
    if (!shouldAutoplayAudio) return;
    const node = audioRef.current;
    if (!node) return;
    node.currentTime = 0;
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        /* autoplay can be blocked; user can press Replay */
      });
    }
  }, [shouldAutoplayAudio, media.audioUrl]);

  if (!surface.text && !surface.audio && !surface.image) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="review-card-media">
      {surface.image && media.imageUrl ? (
        <figure className="rounded-lg border border-ink/10 bg-paper-warm/40 p-2">
          {/* Image assets pipeline is deferred — the alt text still surfaces
              the meaning even when the asset 404s, so the Learner sees the
              labelled placeholder. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.imageUrl}
            alt={media.imageAlt ?? itemRef.pt}
            className="h-32 w-full rounded object-cover"
            data-testid="review-card-image"
          />
          <figcaption className="mt-1 text-xs text-ink-mute">
            <span className="stage-stamp mr-2">Image</span>
            {media.imageAlt}
          </figcaption>
        </figure>
      ) : null}
      {surface.audio && media.audioUrl ? (
        <div className="flex items-center gap-3" data-testid="review-card-audio">
          <audio
            ref={audioRef}
            src={media.audioUrl}
            preload="auto"
            controls
            data-testid="review-card-audio-element"
          />
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              const node = audioRef.current;
              if (!node) return;
              node.currentTime = 0;
              void node.play().catch(() => undefined);
            }}
            data-testid="review-card-audio-replay"
          >
            Replay
          </button>
        </div>
      ) : null}
    </div>
  );
}