import { describe, expect, it } from "vitest";
import { audioUrlFor, imageUrlFor, mediaFor } from "@/lib/srs/media";
import {
  DEFAULT_RETRIEVAL_MODE,
  RETRIEVAL_MODES,
  isRetrievalMode,
  resolveRetrievalMode,
  surfaceForMode,
} from "@/lib/settings";

describe("audioUrlFor + imageUrlFor", () => {
  it("returns null when no asset id is present", () => {
    expect(audioUrlFor({ unitId: "a0-1" })).toBeNull();
    expect(imageUrlFor({ unitId: "a0-1" })).toBeNull();
  });

  it("builds the expected /assets/tts/{unitId}/{assetId}.mp3 path", () => {
    expect(
      audioUrlFor({ audioAssetId: "v-bom-dia", unitId: "a0-1-alfabeto-saudacoes" }),
    ).toBe("/assets/tts/a0-1-alfabeto-saudacoes/v-bom-dia.mp3");
  });

  it("builds the expected /assets/img/{unitId}/{assetId}.svg path", () => {
    expect(
      imageUrlFor({ imageAssetId: "v-bom-dia", unitId: "a0-1-alfabeto-saudacoes" }),
    ).toBe("/assets/img/a0-1-alfabeto-saudacoes/v-bom-dia.svg");
  });
});

describe("mediaFor", () => {
  it("returns null URLs and a derived alt string", () => {
    const media = mediaFor({ pt: "olá", gloss: "hello", unitId: "a0-1" });
    expect(media.audioUrl).toBeNull();
    expect(media.imageUrl).toBeNull();
    expect(media.imageAlt).toBe("olá — hello");
  });

  it("returns populated URLs when asset ids are present", () => {
    const media = mediaFor({
      pt: "bom dia",
      gloss: "good morning",
      unitId: "a0-1-alfabeto-saudacoes",
      audioAssetId: "v-bom-dia",
      imageAssetId: "img-bom-dia",
    });
    expect(media.audioUrl).toBe("/assets/tts/a0-1-alfabeto-saudacoes/v-bom-dia.mp3");
    expect(media.imageUrl).toBe("/assets/img/a0-1-alfabeto-saudacoes/img-bom-dia.svg");
    expect(media.imageAlt).toBe("bom dia — good morning");
  });
});

describe("retrieval mode", () => {
  it("exposes the four canonical modes", () => {
    expect(RETRIEVAL_MODES).toEqual(["text", "text+audio", "text+image", "text+audio+image"]);
  });

  it("default is text+audio", () => {
    expect(DEFAULT_RETRIEVAL_MODE).toBe("text+audio");
  });

  it("isRetrievalMode narrows strings", () => {
    expect(isRetrievalMode("text+audio")).toBe(true);
    expect(isRetrievalMode("nonsense")).toBe(false);
    expect(isRetrievalMode(null)).toBe(false);
  });

  it("surfaceForMode produces the right flags", () => {
    expect(surfaceForMode("text")).toEqual({ text: true, audio: false, image: false });
    expect(surfaceForMode("text+audio")).toEqual({ text: true, audio: true, image: false });
    expect(surfaceForMode("text+image")).toEqual({ text: true, audio: false, image: true });
    expect(surfaceForMode("text+audio+image")).toEqual({
      text: true,
      audio: true,
      image: true,
    });
  });

  it("resolveRetrievalMode returns 'text' when textOnlyMode is on", () => {
    expect(
      resolveRetrievalMode({ textOnlyMode: true, retrievalMode: "text+audio+image" }),
    ).toBe("text");
  });

  it("resolveRetrievalMode returns the configured retrievalMode otherwise", () => {
    expect(
      resolveRetrievalMode({ textOnlyMode: false, retrievalMode: "text+image" }),
    ).toBe("text+image");
  });

  it("resolveRetrievalMode falls back to the default when retrievalMode is missing", () => {
    expect(
      resolveRetrievalMode({ textOnlyMode: false, retrievalMode: DEFAULT_RETRIEVAL_MODE }),
    ).toBe("text+audio");
  });
});