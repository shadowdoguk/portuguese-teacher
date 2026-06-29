import type { MiniMaxTTS, MockMiniMaxTTS } from "@/lib/minimax";
import type { Curriculum, Scenario, Unit } from "@/lib/curriculum";
import {
  briefingAssetIdFor,
  briefingTextFor,
  BRIEFING_FIELD_ORDER,
  type BriefingField,
} from "@/lib/scenarios/briefing-audio";

export type TtsSourceKind =
  | "vocabulary"
  | "grammar-example"
  | "lesson-audio"
  | "scenario-briefing";

export type TtsSource = {
  unitId: string;
  assetId: string;
  text: string;
  sourceKind: TtsSourceKind;
  sourceRef: string;
};

export type TtsAssetEntry = {
  assetId: string;
  unitId: string;
  url: string;
  durationMs: number;
  voiceId: string;
  text: string;
  sourceKind: TtsSourceKind;
  sourceRef: string;
};

export type TtsManifest = {
  version: 1;
  dialect: "pt-PT";
  voiceId: string;
  generatedAt: string;
  assets: ReadonlyArray<TtsAssetEntry>;
};

export type TtsFileSink = {
  write: (path: string, bytes: Uint8Array) => Promise<void> | void;
  mkdir: (path: string) => Promise<void> | void;
  formatPath: (unitId: string, assetId: string) => string;
};

export type TtsSynthesizeFn = (
  text: string,
) => Promise<{ bytes: Uint8Array; durationMs: number }>;

export type TtsPipelineDeps = {
  tts?: MiniMaxTTS | MockMiniMaxTTS;
  synthesize?: TtsSynthesizeFn;
  voiceId: string;
  curriculum: Curriculum;
  fileSink?: TtsFileSink;
  now?: () => Date;
};

export type TtsPipelineResult = {
  manifest: TtsManifest;
  entries: ReadonlyArray<TtsAssetEntry>;
  fileWrites: ReadonlyArray<{ path: string; bytes: number }>;
};

const DEFAULT_FORMAT_PATH = (unitId: string, assetId: string): string =>
  `${unitId}/${assetId}.mp3`;

export function discoverTtsSources(curriculum: Curriculum): TtsSource[] {
  const sources: TtsSource[] = [];
  for (const unit of curriculum.units) {
    for (const vocab of unit.vocabulary) {
      const text = vocab.examplePt ?? vocab.pt;
      const assetId = vocab.audioAssetId ?? `vocab-${unit.id}-${vocab.id}`;
      sources.push({
        unitId: unit.id,
        assetId,
        text,
        sourceKind: "vocabulary",
        sourceRef: vocab.id,
      });
    }
    for (const grammar of unit.grammar) {
      grammar.examples.forEach((example, index) => {
        const assetId = example.audioAssetId ?? `grammar-${unit.id}-${grammar.id}-ex${index}`;
        sources.push({
          unitId: unit.id,
          assetId,
          text: example.pt,
          sourceKind: "grammar-example",
          sourceRef: `${grammar.id}#${index}`,
        });
      });
    }
    walkLessonAudio(unit, sources);
    for (const scenario of unit.scenarios) {
      walkScenarioBriefing(scenario, sources);
    }
  }
  return dedupeSources(sources);
}

function walkLessonAudio(unit: Unit, sink: TtsSource[]): void {
  for (const lesson of unit.lessons) {
    for (const block of lesson.body.blocks) {
      if (block.kind === "audio") {
        sink.push({
          unitId: unit.id,
          assetId: block.assetId,
          text: block.text,
          sourceKind: "lesson-audio",
          sourceRef: `${lesson.id}#${block.assetId}`,
        });
      }
    }
  }
}

function walkScenarioBriefing(scenario: Scenario, sink: TtsSource[]): void {
  // Three audio assets per scenario (goal → setting → preTask). Issue #45
  // acceptance: "every scenario in the library has audio for preTask,
  // goal, and setting". The asset IDs come from the scenario's explicit
  // fields when set, otherwise the deterministic fallback in
  // `briefing-audio.ts`. Empty copy is skipped so a blank `preTask`
  // doesn't pad the briefing with silence.
  for (const field of BRIEFING_FIELD_ORDER) {
    const text = briefingTextFor(scenario, field).trim();
    if (!text) continue;
    const assetId = briefingAssetIdFor(scenario, field);
    sink.push({
      unitId: scenario.unitId,
      assetId,
      text,
      sourceKind: "scenario-briefing",
      sourceRef: `${scenario.id}#${field satisfies BriefingField}`,
    });
  }
}

function dedupeSources(sources: TtsSource[]): TtsSource[] {
  const map = new Map<string, TtsSource>();
  for (const source of sources) {
    const key = `${source.unitId}:${source.assetId}`;
    if (!map.has(key)) {
      map.set(key, source);
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.unitId !== b.unitId) return a.unitId.localeCompare(b.unitId);
    return a.assetId.localeCompare(b.assetId);
  });
}

export async function runTtsPipeline(deps: TtsPipelineDeps): Promise<TtsPipelineResult> {
  if (!deps.tts && !deps.synthesize) {
    throw new Error("runTtsPipeline requires either `tts` or `synthesize`");
  }
  const synthesize: TtsSynthesizeFn =
    deps.synthesize ??
    (async (text) => {
      const client = deps.tts!;
      const result = await client.synthesize(text, {
        voice: { id: deps.voiceId, dialect: "pt-PT", gender: "female" },
      });
      return { bytes: await blobToBuffer(result.audio), durationMs: result.durationMs };
    });

  const sources = discoverTtsSources(deps.curriculum);
  const entries: TtsAssetEntry[] = [];
  const fileWrites: Array<{ path: string; bytes: number }> = [];
  const formatPath = deps.fileSink?.formatPath ?? DEFAULT_FORMAT_PATH;

  for (const source of sources) {
    const { bytes, durationMs } = await synthesize(source.text);
    const url = `/assets/tts/${formatPath(source.unitId, source.assetId)}`;
    entries.push({
      assetId: source.assetId,
      unitId: source.unitId,
      url,
      durationMs,
      voiceId: deps.voiceId,
      text: source.text,
      sourceKind: source.sourceKind,
      sourceRef: source.sourceRef,
    });
    if (deps.fileSink) {
      const path = formatPath(source.unitId, source.assetId);
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (dir) await deps.fileSink.mkdir(dir);
      await deps.fileSink.write(path, bytes);
      fileWrites.push({ path, bytes: bytes.byteLength });
    }
  }

  entries.sort((a, b) => {
    if (a.unitId !== b.unitId) return a.unitId.localeCompare(b.unitId);
    return a.assetId.localeCompare(b.assetId);
  });

  const now = deps.now ? deps.now() : new Date();
  const manifest: TtsManifest = {
    version: 1,
    dialect: "pt-PT",
    voiceId: deps.voiceId,
    generatedAt: now.toISOString(),
    assets: entries,
  };

  return { manifest, entries, fileWrites };
}

async function blobToBuffer(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  throw new Error(
    "Blob does not expose arrayBuffer(); pass an explicit `synthesize` function instead",
  );
}

export function collectReferencedAssetIds(curriculum: Curriculum): ReadonlySet<string> {
  const refs = new Set<string>();
  for (const unit of curriculum.units) {
    for (const vocab of unit.vocabulary) {
      if (vocab.audioAssetId) refs.add(vocab.audioAssetId);
    }
    for (const grammar of unit.grammar) {
      for (const example of grammar.examples) {
        if (example.audioAssetId) refs.add(example.audioAssetId);
      }
    }
    for (const lesson of unit.lessons) {
      for (const block of lesson.body.blocks) {
        if (block.kind === "audio") refs.add(block.assetId);
      }
    }
    for (const scenario of unit.scenarios) {
      for (const field of BRIEFING_FIELD_ORDER) {
        refs.add(briefingAssetIdFor(scenario, field));
      }
    }
  }
  return refs;
}

export function findOrphanReferences(
  curriculum: Curriculum,
  manifest: TtsManifest,
): ReadonlyArray<string> {
  const referenced = collectReferencedAssetIds(curriculum);
  const present = new Set(manifest.assets.map((a) => a.assetId));
  const orphans: string[] = [];
  for (const ref of referenced) {
    if (!present.has(ref)) orphans.push(ref);
  }
  return orphans.sort();
}