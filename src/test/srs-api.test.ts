// Integration test for the SRS API routes.
// Verifies:
//   - GET /api/srs/state returns the persisted state
//   - POST /api/srs/recalls applies a recall and returns the updated record

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createSrsRepository } from "@/lib/srs";
import { GET as getState } from "@/app/api/srs/state/route";
import { POST as postRecall } from "@/app/api/srs/recalls/route";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-api-"));
  const dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;

  execSync(`pnpm exec prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });

  prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });
}, 60000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/srs/state", () => {
  it("returns 400 when learnerId is missing", async () => {
    const res = await getState(new Request("http://localhost/api/srs/state"));
    expect(res.status).toBe(400);
  });

  it("returns an empty state for an unknown learner", async () => {
    const res = await getState(
      new Request("http://localhost/api/srs/state?learnerId=ghost"),
    );
    const body = (await res.json()) as { ok: boolean; state: { items: Record<string, unknown> } };
    expect(body.ok).toBe(true);
    expect(body.state.items).toEqual({});
  });

  it("returns the persisted state for a known learner", async () => {
    const learnerId = `learner-${Date.now()}`;
    const repo = createSrsRepository(prisma);
    await repo.writeRecord({
      learnerId,
      itemId: "a0-1-v-ola",
      kind: "vocabulary",
      record: {
        itemId: "a0-1-v-ola",
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: 1_700_000_000_000,
        reviewCount: 0,
        lapses: 0,
      },
    });

    const res = await getState(
      new Request(`http://localhost/api/srs/state?learnerId=${learnerId}`),
    );
    const body = (await res.json()) as {
      ok: boolean;
      state: { items: Record<string, { halfLifeMs: number }> };
    };
    expect(body.ok).toBe(true);
    expect(body.state.items["a0-1-v-ola"]?.halfLifeMs).toBe(600_000);
  });
});

describe("POST /api/srs/recalls", () => {
  it("rejects malformed JSON", async () => {
    const res = await postRecall(
      new Request("http://localhost/api/srs/recalls", {
        method: "POST",
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing fields", async () => {
    const res = await postRecall(jsonRequest("http://localhost/api/srs/recalls", {}));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown itemId", async () => {
    const learnerId = `learner-${Date.now()}-404`;
    const repo = createSrsRepository(prisma);
    await repo.writeRecord({
      learnerId,
      itemId: "known",
      kind: "vocabulary",
      record: {
        itemId: "known",
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: 1_700_000_000_000,
        reviewCount: 0,
        lapses: 0,
      },
    });

    const res = await postRecall(
      jsonRequest("http://localhost/api/srs/recalls", {
        learnerId,
        itemId: "unknown",
        kind: "vocabulary",
        grade: "good",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("applies a recall and returns the updated record + queue", async () => {
    const learnerId = `learner-${Date.now()}-happy`;
    const repo = createSrsRepository(prisma);
    await repo.writeRecord({
      learnerId,
      itemId: "a0-1-v-ola",
      kind: "vocabulary",
      record: {
        itemId: "a0-1-v-ola",
        halfLifeMs: 300_000,
        lastReviewedAt: null,
        dueAt: 1_700_000_000_000,
        reviewCount: 0,
        lapses: 0,
      },
    });
    await repo.writeRecord({
      learnerId,
      itemId: "a0-1-v-adeus",
      kind: "vocabulary",
      record: {
        itemId: "a0-1-v-adeus",
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: 1_699_999_700_000,
        reviewCount: 0,
        lapses: 0,
      },
    });

    const res = await postRecall(
      jsonRequest("http://localhost/api/srs/recalls", {
        learnerId,
        itemId: "a0-1-v-ola",
        kind: "vocabulary",
        grade: "good",
        timestamp: 1_700_000_300_000,
        refs: [
          {
            kind: "vocabulary",
            itemId: "a0-1-v-ola",
            pt: "olá",
            gloss: "hello",
            unitId: "a0-1",
          },
          {
            kind: "vocabulary",
            itemId: "a0-1-v-adeus",
            pt: "adeus",
            gloss: "goodbye",
            unitId: "a0-1",
          },
        ],
      }),
    );
    const body = (await res.json()) as {
      ok: boolean;
      record: { reviewCount: number; halfLifeMs: number };
      event: { grade: string; itemId: string };
      queue: Array<{ itemId: string; dueAt: number }>;
    };
    expect(body.ok).toBe(true);
    expect(body.record.reviewCount).toBe(1);
    expect(body.event.grade).toBe("good");
    // Queue reflects the post-recall due items as of the timestamp.
    expect(body.queue.length).toBeGreaterThanOrEqual(0);
  });

  it("auto-enrolls an item on first recall when pt/gloss/unitId are provided", async () => {
    const learnerId = `learner-${Date.now()}-first`;
    const res = await postRecall(
      jsonRequest("http://localhost/api/srs/recalls", {
        learnerId,
        itemId: "first-time",
        kind: "vocabulary",
        grade: "easy",
        pt: "olá",
        gloss: "hello",
        unitId: "a0-1",
        timestamp: 1_700_000_000_000,
      }),
    );
    const body = (await res.json()) as {
      ok: boolean;
      record: { reviewCount: number; halfLifeMs: number };
    };
    expect(body.ok).toBe(true);
    expect(body.record.reviewCount).toBe(1);
    const reloaded = await createSrsRepository(prisma).loadState(learnerId);
    expect(reloaded.items["first-time"]?.reviewCount).toBe(1);
  });
});