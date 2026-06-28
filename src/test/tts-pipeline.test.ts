import { describe, expect, it } from "vitest";
import {
  collectReferencedAssetIds,
  discoverTtsSources,
  findOrphanReferences,
  runTtsPipeline,
  type TtsFileSink,
} from "@/lib/assets/tts-pipeline";
import type { Curriculum } from "@/lib/curriculum";
import { A0_CURRICULUM } from "@/lib/curriculum/seed-a0";

async function deterministicSynthesize(
  text: string,
): Promise<{ bytes: Uint8Array; durationMs: number }> {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = (text.charCodeAt(i % text.length) + i) & 0xff;
  }
  const durationMs = Math.round((text.length / 14) * 1000);
  return { bytes, durationMs };
}

function buildMinimalCurriculum(): Curriculum {
  return {
    dialect: "pt-PT",
    entryUnitId: "u1",
    milestones: [],
    units: [
      {
        id: "u1",
        level: "A0",
        order: 1,
        title: "Unit 1",
        description: "",
        prerequisiteUnitIds: [],
        remedialAnchors: [],
        scenarios: [],
        vocabulary: [
          { id: "v1", unitId: "u1", pt: "olá", gloss: "hello" },
          {
            id: "v2",
            unitId: "u1",
            pt: "adeus",
            gloss: "goodbye",
            audioAssetId: "u1-vocab-v2",
          },
        ],
        grammar: [
          {
            id: "g1",
            unitId: "u1",
            name: "Present tense",
            description: "",
            examples: [
              { pt: "Eu falo.", gloss: "I speak." },
              { pt: "Tu falas.", gloss: "You speak.", audioAssetId: "u1-grammar-g1-ex1" },
            ],
          },
        ],
        lessons: [
          {
            id: "l1",
            unitId: "u1",
            order: 1,
            kind: "vocabulary",
            title: "Lesson 1",
            estimatedMinutes: 5,
            body: {
              introduction: "",
              blocks: [
                {
                  kind: "audio",
                  assetId: "u1-lesson-l1-a1",
                  text: "Olá, bom dia!",
                },
              ],
            },
            exercises: [],
          },
        ],
      },
    ],
  };
}

describe("discoverTtsSources", () => {
  it("walks vocabulary, grammar examples, and lesson audio blocks", () => {
    const sources = discoverTtsSources(buildMinimalCurriculum());
    const bySource = sources.map((s) => ({ kind: s.sourceKind, assetId: s.assetId }));
    expect(bySource).toEqual(
      expect.arrayContaining([
        { kind: "vocabulary", assetId: "vocab-u1-v1" },
        { kind: "vocabulary", assetId: "u1-vocab-v2" },
        { kind: "grammar-example", assetId: "grammar-u1-g1-ex0" },
        { kind: "grammar-example", assetId: "u1-grammar-g1-ex1" },
        { kind: "lesson-audio", assetId: "u1-lesson-l1-a1" },
      ]),
    );
  });

  it("prefers explicit audioAssetId over the deterministic default", () => {
    const sources = discoverTtsSources(buildMinimalCurriculum());
    const v2 = sources.find((s) => s.sourceRef === "v2");
    expect(v2?.assetId).toBe("u1-vocab-v2");
  });

  it("uses examplePt for vocabulary when available", () => {
    const curriculum: Curriculum = {
      dialect: "pt-PT",
      entryUnitId: "u1",
      milestones: [],
      units: [
        {
          id: "u1",
          level: "A0",
          order: 1,
          title: "Unit 1",
          description: "",
          prerequisiteUnitIds: [],
          remedialAnchors: [],
          scenarios: [],
          vocabulary: [
            {
              id: "v1",
              unitId: "u1",
              pt: "olá",
              gloss: "hello",
              examplePt: "Olá, bom dia!",
            },
          ],
          grammar: [],
          lessons: [],
        },
      ],
    };
    const sources = discoverTtsSources(curriculum);
    expect(sources[0]?.text).toBe("Olá, bom dia!");
  });

  it("dedupes overlapping assetIds deterministically", () => {
    const sources = discoverTtsSources(buildMinimalCurriculum());
    const keys = sources.map((s) => `${s.unitId}:${s.assetId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("walks the A0 curriculum in a deterministic order", () => {
    const sources = discoverTtsSources(A0_CURRICULUM);
    expect(sources.length).toBeGreaterThan(0);
    const ids = sources.map((s) => `${s.unitId}/${s.assetId}`);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });
});

describe("runTtsPipeline", () => {
  it("produces a manifest whose assets match the discovered sources", async () => {
    const result = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: buildMinimalCurriculum(),
      now: () => new Date("2026-06-28T12:00:00Z"),
    });
    expect(result.manifest.version).toBe(1);
    expect(result.manifest.dialect).toBe("pt-PT");
    expect(result.manifest.voiceId).toBe("minimax-pt-pt-female-1");
    expect(result.manifest.assets.length).toBe(result.entries.length);
  });

  it("writes audio files to the sink when provided", async () => {
    const writes: Array<{ path: string; bytes: Uint8Array }> = [];
    const dirs = new Set<string>();
    const sink: TtsFileSink = {
      write: (path, bytes) => {
        writes.push({ path, bytes });
      },
      mkdir: (path) => {
        dirs.add(path);
      },
      formatPath: (unitId, assetId) => `${unitId}/${assetId}.mp3`,
    };
    await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: buildMinimalCurriculum(),
      fileSink: sink,
      now: () => new Date("2026-06-28T12:00:00Z"),
    });
    expect(writes.length).toBeGreaterThan(0);
    expect(dirs.size).toBeGreaterThan(0);
    expect(writes[0]?.bytes.byteLength).toBeGreaterThan(0);
  });

  it("produces byte-identical output for repeated runs (determinism)", async () => {
    const sinkA: TtsFileSink = {
      write: () => undefined,
      mkdir: () => undefined,
      formatPath: (unitId, assetId) => `${unitId}/${assetId}.mp3`,
    };
    const sinkB: TtsFileSink = {
      write: () => undefined,
      mkdir: () => undefined,
      formatPath: (unitId, assetId) => `${unitId}/${assetId}.mp3`,
    };
    const r1 = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: buildMinimalCurriculum(),
      fileSink: sinkA,
      now: () => new Date("2026-06-28T12:00:00Z"),
    });
    const r2 = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: buildMinimalCurriculum(),
      fileSink: sinkB,
      now: () => new Date("2026-06-28T12:00:00Z"),
    });
    expect(r1.fileWrites).toEqual(r2.fileWrites);
    expect(r1.manifest.assets.map((a) => a.durationMs)).toEqual(
      r2.manifest.assets.map((a) => a.durationMs),
    );
  });

  it("clips the generatedAt timestamp to the clock provided", async () => {
    const fixed = new Date("2026-06-28T08:30:00.000Z");
    const result = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: buildMinimalCurriculum(),
      now: () => fixed,
    });
    expect(result.manifest.generatedAt).toBe(fixed.toISOString());
  });

  it("rejects when neither tts nor synthesize is provided", async () => {
    await expect(
      runTtsPipeline({
        voiceId: "minimax-pt-pt-female-1",
        curriculum: buildMinimalCurriculum(),
      }),
    ).rejects.toThrow(/requires either/);
  });
});

describe("orphan references", () => {
  it("returns audioAssetIds that have no matching manifest entry", () => {
    const manifest = {
      version: 1 as const,
      dialect: "pt-PT" as const,
      voiceId: "minimax-pt-pt-female-1",
      generatedAt: "2026-06-28T00:00:00.000Z",
      assets: [{ assetId: "present", unitId: "u1", url: "", durationMs: 0, voiceId: "", text: "", sourceKind: "vocabulary" as const, sourceRef: "" }],
    };
    const orphans = findOrphanReferences(buildMinimalCurriculum(), manifest);
    expect(orphans).toContain("u1-vocab-v2");
    expect(orphans).toContain("u1-grammar-g1-ex1");
    expect(orphans).toContain("u1-lesson-l1-a1");
    expect(orphans).not.toContain("present");
  });

  it("collects all referenced assetIds across the curriculum", () => {
    const refs = collectReferencedAssetIds(buildMinimalCurriculum());
    expect(refs.has("u1-vocab-v2")).toBe(true);
    expect(refs.has("u1-grammar-g1-ex1")).toBe(true);
    expect(refs.has("u1-lesson-l1-a1")).toBe(true);
  });
});

describe("A0 curriculum snapshot", () => {
  it("produces a stable manifest across runs", async () => {
    const fixedDate = new Date("2026-06-28T12:00:00.000Z");
    const r1 = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: A0_CURRICULUM,
      now: () => fixedDate,
    });
    const r2 = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: A0_CURRICULUM,
      now: () => fixedDate,
    });
    expect(r1.manifest).toEqual(r2.manifest);
    expect(r1.manifest.assets.length).toBeGreaterThan(0);
    expect(r1.manifest.generatedAt).toBe(fixedDate.toISOString());
  });

  it("the manifest has no orphan references when the curriculum carries no explicit audioAssetIds", async () => {
    const result = await runTtsPipeline({
      synthesize: deterministicSynthesize,
      voiceId: "minimax-pt-pt-female-1",
      curriculum: A0_CURRICULUM,
      now: () => new Date("2026-06-28T12:00:00.000Z"),
    });
    const orphans = findOrphanReferences(A0_CURRICULUM, result.manifest);
    expect(orphans).toEqual([]);
  });
});