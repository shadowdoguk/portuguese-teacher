import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings/SettingsProvider";
import { DEFAULT_SETTINGS, resolveRetrievalMode, surfaceForMode } from "@/lib/settings";
import { ReviewCardMedia } from "@/components/review/ReviewCardMedia";

const originalFetch = global.fetch;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function Harness({
  retrievalMode,
  textOnlyMode,
  itemRef,
  surface,
}: {
  retrievalMode?: "text" | "text+audio" | "text+image" | "text+audio+image";
  textOnlyMode?: boolean;
  surface?: { text: boolean; audio: boolean; image: boolean };
  itemRef: {
    audioAssetId?: string;
    imageAssetId?: string;
    unitId: string;
    pt: string;
    gloss: string;
  };
}) {
  const settings = {
    ...DEFAULT_SETTINGS,
    retrievalMode: retrievalMode ?? DEFAULT_SETTINGS.retrievalMode,
    textOnlyMode: textOnlyMode ?? DEFAULT_SETTINGS.textOnlyMode,
  };
  const resolvedSurface = surface ?? surfaceForMode(resolveRetrievalMode(settings));
  return (
    <AuthProvider>
      <SettingsProvider initialSettings={settings}>
        <ReviewCardMedia itemRef={itemRef} surface={resolvedSurface} />
      </SettingsProvider>
    </AuthProvider>
  );
}

describe("ReviewCardMedia", () => {
  it("renders nothing when surface flags are all off", () => {
    const { container } = render(
      <Harness
        surface={{ text: false, audio: false, image: false }}
        itemRef={{
          audioAssetId: "v-bom-dia",
          unitId: "a0-1-alfabeto-saudacoes",
          pt: "bom dia",
          gloss: "good morning",
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the audio element + replay button when surface.audio is on and the asset id resolves", () => {
    render(
      <Harness
        retrievalMode="text+audio"
        itemRef={{
          audioAssetId: "v-bom-dia",
          unitId: "a0-1-alfabeto-saudacoes",
          pt: "bom dia",
          gloss: "good morning",
        }}
      />,
    );
    const audio = screen.getByTestId("review-card-audio-element");
    expect(audio.getAttribute("src")).toBe(
      "/assets/tts/a0-1-alfabeto-saudacoes/v-bom-dia.mp3",
    );
    expect(screen.getByTestId("review-card-audio-replay")).toBeInTheDocument();
  });

  it("does not render the audio element when the ref has no audioAssetId", () => {
    render(
      <Harness
        retrievalMode="text+audio"
        itemRef={{
          unitId: "a0-1-alfabeto-saudacoes",
          pt: "olá",
          gloss: "hello",
        }}
      />,
    );
    expect(screen.queryByTestId("review-card-audio-element")).toBeNull();
  });

  it("renders the image with the derived alt text when surface.image is on", () => {
    render(
      <Harness
        retrievalMode="text+image"
        itemRef={{
          imageAssetId: "img-bom-dia",
          unitId: "a0-1-alfabeto-saudacoes",
          pt: "bom dia",
          gloss: "good morning",
        }}
      />,
    );
    const img = screen.getByTestId("review-card-image");
    expect(img.getAttribute("src")).toBe(
      "/assets/img/a0-1-alfabeto-saudacoes/img-bom-dia.svg",
    );
    expect(img.getAttribute("alt")).toBe("bom dia — good morning");
  });

  it("renders audio + image together when surface.text+audio+image is on", () => {
    render(
      <Harness
        retrievalMode="text+audio+image"
        itemRef={{
          audioAssetId: "v-bom-dia",
          imageAssetId: "img-bom-dia",
          unitId: "a0-1-alfabeto-saudacoes",
          pt: "bom dia",
          gloss: "good morning",
        }}
      />,
    );
    expect(screen.getByTestId("review-card-audio-element")).toBeInTheDocument();
    expect(screen.getByTestId("review-card-image")).toBeInTheDocument();
  });

  it("the audio autoplay attempt is silenced when the browser blocks it", async () => {
    const playMock = vi.fn(() => Promise.reject(new Error("autoplay blocked")));
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation(((tag: string) => {
        const node = originalCreateElement(tag);
        if (tag === "audio") {
          (node as HTMLAudioElement).play = playMock as HTMLAudioElement["play"];
        }
        return node;
      }) as typeof document.createElement);

    render(
      <Harness
        retrievalMode="text+audio"
        itemRef={{
          audioAssetId: "v-bom-dia",
          unitId: "a0-1-alfabeto-saudacoes",
          pt: "bom dia",
          gloss: "good morning",
        }}
      />,
    );

    await waitFor(() => {
      expect(playMock).toHaveBeenCalled();
    });
    expect(screen.getByTestId("review-card-audio-replay")).toBeInTheDocument();
    createElementSpy.mockRestore();
  });
});