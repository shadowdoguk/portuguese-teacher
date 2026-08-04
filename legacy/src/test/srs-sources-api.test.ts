// Integration test for POST /api/srs/sources — the partial-completion tag
// write endpoint that closes the "Learner drops mid-scenario" gap from
// issue #104. Also exercises the slimmed route handlers (recalls, state,
// events) against the SrsService seam end-to-end.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { POST as postRecall } from "@/app/api/srs/recalls/route";
import { GET as getState } from "@/app/api/srs/state/route";
import { POST as postSources } from "@/app/api/srs/sources/route";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-sources-api-"));
  const dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync(`pnpm exec prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
}, 60000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/srs/sources", () => {
  it("rejects malformed JSON", async () => {
    const res = await postSources(
      new Request("http://localhost/api/srs/sources", {
        method: "POST",
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects when learnerId is missing", async () => {
    const res = await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        scenarioId: "s-x",
        itemIds: ["a"],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects when scenarioId is missing", async () => {
    const res = await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        learnerId: "l-1",
        itemIds: ["a"],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("records scenario sources and returns the count", async () => {
    const learnerId = `learner-${Date.now()}-sources-happy`;
    const res = await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        learnerId,
        scenarioId: "s-cafe-1-pedir-basico",
        itemIds: ["a0-3-v-agua", "a0-3-v-cafe", "a0-3-v-pastel-nata"],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; recordedSources: number };
    expect(body.ok).toBe(true);
    expect(body.recordedSources).toBe(3);

    const rows = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.sourceScenarioId === "s-cafe-1-pedir-basico")).toBe(true);
  });

  it("is idempotent — re-posting the same tags leaves the row count unchanged", async () => {
    const learnerId = `learner-${Date.now()}-sources-idem`;
    const first = await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        learnerId,
        scenarioId: "s-cafe-1",
        itemIds: ["a0-3-v-agua", "a0-3-v-cafe"],
      }),
    );
    const second = await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        learnerId,
        scenarioId: "s-cafe-1",
        itemIds: ["a0-3-v-agua", "a0-3-v-cafe"],
      }),
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const rows = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(rows).toHaveLength(2);
  });

  it("returns 0 for an empty itemIds list", async () => {
    const learnerId = `learner-${Date.now()}-sources-empty`;
    const res = await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        learnerId,
        scenarioId: "s-x",
        itemIds: [],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; recordedSources: number };
    expect(body.recordedSources).toBe(0);
  });

  it("surfaces the partial-completion tag in /api/srs/state", async () => {
    const learnerId = `learner-${Date.now()}-sources-state`;
    await postSources(
      jsonRequest("http://localhost/api/srs/sources", {
        learnerId,
        scenarioId: "s-greetings-1",
        itemIds: ["a0-1-v-bom-dia", "a0-1-v-obrigado"],
      }),
    );

    const res = await getState(
      new Request(`http://localhost/api/srs/state?learnerId=${learnerId}`),
    );
    const body = (await res.json()) as {
      ok: boolean;
      sources: Array<{ itemId: string; sourceScenarioId: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.sources).toHaveLength(2);
    for (const source of body.sources) {
      expect(source.sourceScenarioId).toBe("s-greetings-1");
    }
  });
});

describe("POST /api/srs/recalls — slimmed handler", () => {
  it("persists a first-recall via the typed auto-enroll seam", async () => {
    const learnerId = `learner-${Date.now()}-recalls-route`;
    const res = await postRecall(
      jsonRequest("http://localhost/api/srs/recalls", {
        learnerId,
        itemId: "v-route-1",
        kind: "vocabulary",
        grade: "good",
        pt: "olá",
        gloss: "hello",
        unitId: "a0-1",
        timestamp: 1_700_000_000_000,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      record: { reviewCount: number };
      enrolled: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.record.reviewCount).toBe(1);
    expect(body.enrolled).toBe(true);

    const row = await prisma.srsReviewRecord.findUnique({
      where: { learnerId_itemId: { learnerId, itemId: "v-route-1" } },
    });
    expect(row?.kind).toBe("vocabulary");
  });

  it("returns 404 for an unknown item without an enroll", async () => {
    const res = await postRecall(
      jsonRequest("http://localhost/api/srs/recalls", {
        learnerId: `learner-${Date.now()}-recalls-404`,
        itemId: "ghost",
        kind: "vocabulary",
        grade: "good",
      }),
    );
    expect(res.status).toBe(404);
  });
});
