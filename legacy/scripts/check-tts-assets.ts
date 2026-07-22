#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { A0_CURRICULUM } from "../src/lib/curriculum/seed-a0";
import {
  collectReferencedAssetIds,
  findOrphanReferences,
  type TtsManifest,
} from "../src/lib/assets/tts-pipeline";

const MANIFEST_PATH = join(process.cwd(), "public", "assets", "tts", "manifest.json");

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(MANIFEST_PATH, "utf-8");
  } catch (error) {
    console.error(
      `[assets:check] manifest missing at ${MANIFEST_PATH}; run \`pnpm assets:tts\` first`,
    );
    process.exit(1);
  }
  const manifest = JSON.parse(raw) as TtsManifest;
  const orphans = findOrphanReferences(A0_CURRICULUM, manifest);
  const referenced = collectReferencedAssetIds(A0_CURRICULUM);
  if (orphans.length > 0) {
    console.error(
      `[assets:check] found ${orphans.length} orphan audioAssetId reference(s):`,
    );
    for (const orphan of orphans) console.error(`  - ${orphan}`);
    process.exit(1);
  }
  console.info(
    `[assets:check] OK: ${manifest.assets.length} assets, ${referenced.size} referenced`,
  );
}

main().catch((err) => {
  console.error("[assets:check] failed:", err);
  process.exit(1);
});