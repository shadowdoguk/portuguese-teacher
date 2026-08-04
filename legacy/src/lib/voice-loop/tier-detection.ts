import type { BrowserTier, VoiceLoopTierCapabilities } from "./types";

export type NavigatorLike = {
  userAgent?: string;
  vendor?: string;
};

export type WindowLike = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  MediaRecorder?: unknown;
};

export function detectCapabilities(
  userAgent: string,
  windowLike: WindowLike,
): VoiceLoopTierCapabilities {
  const ua = userAgent.toLowerCase();
  const isFirefox = ua.includes("firefox");
  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("crios") &&
    !ua.includes("edge");
  const isChromium =
    ua.includes("chrome") ||
    ua.includes("chromium") ||
    ua.includes("edge") ||
    ua.includes("opr") ||
    ua.includes("brave");

  const speechRecognitionCtor = windowLike.SpeechRecognition ?? windowLike.webkitSpeechRecognition;
  const webSpeechApi = Boolean(speechRecognitionCtor);

  const mediaRecorder = Boolean(windowLike.MediaRecorder);

  if (isFirefox) {
    return {
      tier: 3,
      webSpeechApi,
      mediaRecorder,
      reason: "Firefox: Web Speech API support is effectively absent; degrade to text input.",
    };
  }

  if (isChromium && webSpeechApi && mediaRecorder) {
    return {
      tier: 1,
      webSpeechApi,
      mediaRecorder,
      reason: "Chromium: Web Speech API + MediaRecorder both available; live Tier 1 loop.",
    };
  }

  if (isSafari && mediaRecorder) {
    return {
      tier: 2,
      webSpeechApi,
      mediaRecorder,
      reason: "Safari: MediaRecorder available; batched Tier 2 loop.",
    };
  }

  return {
    tier: 3,
    webSpeechApi,
    mediaRecorder,
    reason: "No audio capture APIs available; degrade to text input.",
  };
}

export function capabilitiesFromGlobals(
  globals: { navigator?: NavigatorLike; window?: WindowLike } = {},
): VoiceLoopTierCapabilities {
  const userAgent = globals.navigator?.userAgent ?? "";
  const windowLike: WindowLike = globals.window ?? {};
  return detectCapabilities(userAgent, windowLike);
}

export function tierForLabel(tier: BrowserTier): string {
  switch (tier) {
    case 1:
      return "Tier 1 · Live (Chromium)";
    case 2:
      return "Tier 2 · Batched (Safari)";
    case 3:
      return "Tier 3 · Text (Firefox / fallback)";
  }
}
