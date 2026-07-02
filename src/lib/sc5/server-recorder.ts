import "server-only";
import type { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { createFireAndForgetRecorder, type Sc5Recorder } from "./recorder";

export function createServerRecorder(prisma: PrismaClient): Sc5Recorder {
  return createFireAndForgetRecorder({
    store: createNodeObjectStore(),
    prisma,
    dialect: "pt-PT",
  });
}

type Sc5NodeObjectStore = {
  write(blob: { utteranceId: string; body: Uint8Array }): Promise<string>;
};

// Writes SC-5 audio blobs to `<cwd>/tmp/sc5-blobs/<safeId>.webm`.
//
// Static `fs/promises` + `path` imports — `import "server-only"` keeps
// this file out of the client bundle. Webpack's server graph is told to
// treat the Node built-ins as external (via `webpack.externals` in
// `next.config.mjs`), so the static imports resolve at runtime to the
// real Node modules instead of being bundled. Issue #T-482.
function createNodeObjectStore(): Sc5NodeObjectStore {
  return {
    async write(blob): Promise<string> {
      const dir = join(process.cwd(), "tmp", "sc5-blobs");
      await mkdir(dir, { recursive: true });
      const safeId = blob.utteranceId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeId}.webm`;
      await writeFile(join(dir, filename), blob.body);
      return `file://${dir}/${filename}?ttl=86400`;
    },
  };
}