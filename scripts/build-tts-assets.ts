#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { A0_CURRICULUM } from "../src/lib/curriculum/seed-a0";
import { runTtsPipeline } from "../src/lib/assets/tts-pipeline";
import { MOCK_PT_VOICE, getMiniMaxClients } from "../src/lib/minimax";

const OUTPUT_DIR = join(process.cwd(), "public", "assets", "tts");

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_MOCK) process.env.NEXT_PUBLIC_MOCK = "1";
  const clients = getMiniMaxClients();
  const voiceId = clients.mock ? MOCK_PT_VOICE.id : "minimax-pt-pt-female-1";
  console.info(`[assets:tts] voiceId=${voiceId} mock=${clients.mock}`);

  const result = await runTtsPipeline({
    tts: clients.tts,
    voiceId,
    curriculum: A0_CURRICULUM,
    fileSink: nodeFileSink(),
    now: () => new Date(),
  });

  for (const write of result.fileWrites) {
    console.info(`[assets:tts] wrote ${write.path} (${write.bytes} bytes)`);
  }
  console.info(
    `[assets:tts] ${result.entries.length} assets, ${result.manifest.assets.length} manifest entries`,
  );

  const manifestPath = join(OUTPUT_DIR, "manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(result.manifest, null, 2));
  console.info(`[assets:tts] manifest written to ${manifestPath}`);
  process.exit(0);
}

function nodeFileSink() {
  const written: string[] = [];
  return {
    write: async (path: string, bytes: Uint8Array) => {
      const abs = join(OUTPUT_DIR, path);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, bytes);
      written.push(relative(OUTPUT_DIR, abs));
    },
    mkdir: async (path: string) => {
      const abs = join(OUTPUT_DIR, path);
      await mkdir(abs, { recursive: true });
    },
    formatPath: (unitId: string, assetId: string) => `${unitId}/${assetId}.mp3`,
    _written: written,
  };
}

main().catch((err) => {
  console.error("[assets:tts] failed:", err);
  process.exit(1);
});