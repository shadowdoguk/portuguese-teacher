// Integration test for the scenario API routes.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { GET as listScenarios } from "@/app/api/scenarios/route";
import { POST as postCompletion } from "@/app/api/scenarios/[id]/complete/route";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-scenarios-api-"));
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

describe("GET /api/scenarios", () => {
  it("returns 400 without learnerId", async () => {
    const res = await listScenarios(new Request("http://localhost/api/scenarios"));
    expect(res.status).toBe(400);
  });

  it("returns an empty snapshot for an unknown learner", async () => {
    const res = await listScenarios(
      new Request("http://localhost/api/scenarios?learnerId=ghost"),
    );
    const body = (await res.json()) as { ok: boolean; snapshot: { byId: Record<string, unknown> } };
    expect(body.ok).toBe(true);
    expect(body.snapshot.byId).toEqual({});
  });
});

describe("POST /api/scenarios/[id]/complete", () => {
  it("rejects missing fields", async () => {
    const res = await postCompletion(
      jsonRequest("http://localhost/api/scenarios/x/complete", {}),
      { params: { id: "x" } },
    );
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range stars value", async () => {
    const res = await postCompletion(
      jsonRequest("http://localhost/api/scenarios/x/complete", {
        learnerId: "alice",
        passed: true,
        stars: 7,
        turnsTaken: 3,
      }),
      { params: { id: "x" } },
    );
    expect(res.status).toBe(400);
  });

  it("records a completion and returns the progress row", async () => {
    const learnerId = `learner-${Date.now()}`;
    const res = await postCompletion(
      jsonRequest(`http://localhost/api/scenarios/s-cafe-1/complete`, {
        learnerId,
        passed: true,
        stars: 2,
        turnsTaken: 4,
        completedAt: 1_700_000_000_000,
      }),
      { params: { id: "s-cafe-1" } },
    );
    const body = (await res.json()) as {
      ok: boolean;
      progress: { bestStars: number; attempts: number };
    };
    expect(body.ok).toBe(true);
    expect(body.progress.bestStars).toBe(2);
    expect(body.progress.attempts).toBe(1);

    const listed = await listScenarios(
      new Request(`http://localhost/api/scenarios?learnerId=${learnerId}`),
    );
    const listedBody = (await listed.json()) as {
      ok: boolean;
      snapshot: { byId: Record<string, { bestStars: number }> };
    };
    expect(listedBody.snapshot.byId["s-cafe-1"]?.bestStars).toBe(2);
  });
});