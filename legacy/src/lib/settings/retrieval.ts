import type { Settings } from "./types";

export type RetrievalMode = "text" | "text+audio" | "text+image" | "text+audio+image";

export const RETRIEVAL_MODES: ReadonlyArray<RetrievalMode> = [
  "text",
  "text+audio",
  "text+image",
  "text+audio+image",
] as const;

export const DEFAULT_RETRIEVAL_MODE: RetrievalMode = "text+audio";

export function isRetrievalMode(value: unknown): value is RetrievalMode {
  return typeof value === "string" && (RETRIEVAL_MODES as readonly string[]).includes(value);
}

export type RetrievalModeSurface = {
  text: boolean;
  audio: boolean;
  image: boolean;
};

export function surfaceForMode(mode: RetrievalMode): RetrievalModeSurface {
  switch (mode) {
    case "text":
      return { text: true, audio: false, image: false };
    case "text+audio":
      return { text: true, audio: true, image: false };
    case "text+image":
      return { text: true, audio: false, image: true };
    case "text+audio+image":
      return { text: true, audio: true, image: true };
  }
}

export function resolveRetrievalMode(settings: Pick<Settings, "textOnlyMode" | "retrievalMode">): RetrievalMode {
  if (settings.textOnlyMode) return "text";
  return settings.retrievalMode ?? DEFAULT_RETRIEVAL_MODE;
}