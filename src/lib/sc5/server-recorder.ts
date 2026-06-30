import "server-only";
import type { PrismaClient } from "@prisma/client";
import { createFireAndForgetRecorder, type Sc5Recorder } from "./recorder";

export function createServerRecorder(prisma: PrismaClient): Sc5Recorder {
  return createFireAndForgetRecorder({
    store: createLazyNodeObjectStore(),
    prisma,
    dialect: "pt-PT",
  });
}

type Sc5NodeObjectStore = {
  write(blob: { utteranceId: string; body: Uint8Array }): Promise<string>;
};

// `fs/promises` and `path` are loaded via `require` (CommonJS) inside a
// runtime-only code path so that webpack can't statically resolve them at
// build time. The instrumentation hook is evaluated by Node.js at server
// startup (runtime: "nodejs"), so the require resolves correctly there.
function createLazyNodeObjectStore(): Sc5NodeObjectStore {
  return {
    async write(blob): Promise<string> {
      const dynamicRequire = createRequire();
      const fsPromises = dynamicRequire("fs/promises") as {
        mkdir: (path: string, options: { recursive: boolean }) => Promise<void>;
        writeFile: (path: string, body: Uint8Array) => Promise<void>;
      };
      const pathMod = dynamicRequire("path") as {
        join: (...parts: string[]) => string;
      };
      const dir = pathMod.join(process.cwd(), "tmp", "sc5-blobs");
      await fsPromises.mkdir(dir, { recursive: true });
      const safeId = blob.utteranceId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeId}.webm`;
      await fsPromises.writeFile(pathMod.join(dir, filename), blob.body);
      return `file://${dir}/${filename}?ttl=86400`;
    },
  };
}

function createRequire(): NodeRequire {
  return (0, eval)("require") as NodeRequire;
}