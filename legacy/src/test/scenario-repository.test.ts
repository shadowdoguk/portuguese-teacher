// Repository test: scenario completions round-trip through Prisma.
//
// Acceptance for issue #44: "Scenario completions persist across devices for
// the same Learner." — covered: the repository reloads the same progress
// after every recordCompletion and produces an equivalent in-memory snapshot.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createScenarioRepository, type ScenarioCompletion } from "@/lib/scenarios";
import { emptySnapshot, recordCompletion } from "@/lib/scenarios/store";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-scenarios-"));
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

describe("ScenarioRepository", () => {
  it("returns an empty snapshot for an unknown learner", async () => {
    const repo = createScenarioRepository(prisma);
    const snap = await repo.loadSnapshot(`learner-${Date.now()}-empty`);
    expect(snap.byId).toEqual({});
  });

  it("records a completion and persists the progress + history row", async () => {
    const repo = createScenarioRepository(prisma);
    const learnerId = `learner-${Date.now()}-first`;
    const result = await repo.recordCompletion(learnerId, {
      scenarioId: "s-cafe-1-pedir-basico",
      passed: true,
      stars: 2,
      turnsTaken: 4,
      completedAt: 1_700_000_000_000,
    });
    expect(result.progress.attempts).toBe(1);
    expect(result.progress.bestStars).toBe(2);
    expect(result.progress.completedAt).toBe(1_700_000_000_000);

    const reloaded = await repo.loadSnapshot(learnerId);
    expect(reloaded.byId["s-cafe-1-pedir-basico"]?.bestStars).toBe(2);
    expect(reloaded.byId["s-cafe-1-pedir-basico"]?.attempts).toBe(1);

    const history = await repo.loadHistory(learnerId, 10);
    expect(history).toHaveLength(1);
    expect(history[0]?.stars).toBe(2);
    expect(history[0]?.passed).toBe(true);
  });

  it("keeps the best stars across multiple attempts", async () => {
    const repo = createScenarioRepository(prisma);
    const learnerId = `learner-${Date.now()}-best`;
    await repo.recordCompletion(learnerId, {
      scenarioId: "s-cafe-2",
      passed: true,
      stars: 1,
      turnsTaken: 5,
      completedAt: 1_700_000_000_000,
    });
    const second = await repo.recordCompletion(learnerId, {
      scenarioId: "s-cafe-2",
      passed: true,
      stars: 3,
      turnsTaken: 3,
      completedAt: 1_700_000_500_000,
    });
    expect(second.progress.bestStars).toBe(3);
    expect(second.progress.attempts).toBe(2);
  });

  it("returns an equivalent snapshot to recordCompletion's pure-function form", async () => {
    const repo = createScenarioRepository(prisma);
    const learnerId = `learner-${Date.now()}-equivalence`;
    const completion: ScenarioCompletion = {
      scenarioId: "s-directions-1-pedir-rua",
      passed: true,
      stars: 2 as const,
      turnsTaken: 4,
      completedAt: 1_700_000_000_000,
    };
    const result = await repo.recordCompletion(learnerId, completion);
    const pureSnapshot = recordCompletion(emptySnapshot(), completion);
    expect(result.snapshot.byId[completion.scenarioId]).toEqual(
      pureSnapshot.byId[completion.scenarioId],
    );
  });

  it("records vocabularyRefs as SrsItemSource rows when provided", async () => {
    const repo = createScenarioRepository(prisma);
    const learnerId = `learner-${Date.now()}-sources`;
    const result = await repo.recordCompletion(
      learnerId,
      {
        scenarioId: "s-cafe-1-pedir-basico",
        passed: true,
        stars: 3,
        turnsTaken: 5,
        completedAt: 1_700_000_000_000,
      },
      { vocabularyRefs: ["a0-3-v-pastel-nata", "a0-3-v-agua", "a0-3-v-cafe"] },
    );
    expect(result.recordedSources).toBe(3);

    const sources = await prisma.srsItemSource.findMany({
      where: { learnerId },
    });
    expect(sources).toHaveLength(3);
    const scenarioIds = sources.map((s) => s.sourceScenarioId);
    expect(new Set(scenarioIds)).toEqual(new Set(["s-cafe-1-pedir-basico"]));
  });

  it("is idempotent on repeated completion — source rows are upserted", async () => {
    const repo = createScenarioRepository(prisma);
    const learnerId = `learner-${Date.now()}-sources-idem`;
    await repo.recordCompletion(
      learnerId,
      {
        scenarioId: "s-cafe-1-pedir-basico",
        passed: true,
        stars: 2,
        turnsTaken: 4,
        completedAt: 1_700_000_000_000,
      },
      { vocabularyRefs: ["a0-3-v-pastel-nata"] },
    );
    await repo.recordCompletion(
      learnerId,
      {
        scenarioId: "s-cafe-1-pedir-basico",
        passed: true,
        stars: 3,
        turnsTaken: 3,
        completedAt: 1_700_001_000_000,
      },
      { vocabularyRefs: ["a0-3-v-pastel-nata"] },
    );
    const sources = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(sources).toHaveLength(1);
  });
});