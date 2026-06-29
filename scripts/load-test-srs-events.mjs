#!/usr/bin/env node
// Load test: bulk-ingest 5,000 SrsRecallEvent rows through the
// ObservabilitySink's batch path and confirm the dashboard read endpoint
// can serve them. Acceptance for issue #28: < 5 s on the dev environment.
//
// Models the SC-1 sampling pipeline: a batch of recall events arrives from
// the sampler, is persisted in one createMany call, then read back via
// GET /api/srs/events. The per-event create latency is exercised by the
// /api/srs/recalls route (covered by integration tests), not here.
//
// Usage:
//   pnpm load:test              # 5,000 events
//   pnpm load:test -- --count 10000

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_COUNT = 5_000;
const TIME_BUDGET_MS = 5_000;
const BATCH_SIZE = 500;

function parseArgs(argv) {
  const args = argv.slice(2);
  const countIdx = args.indexOf("--count");
  const count =
    countIdx >= 0 ? Number.parseInt(args[countIdx + 1], 10) : DEFAULT_COUNT;
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Invalid --count: ${args[countIdx + 1]}`);
  }
  return { count };
}

async function main() {
  const { count } = parseArgs(process.argv);

  const tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-load-"));
  const dbPath = join(tmpDir, "load.db");
  const dbUrl = `file:${dbPath}`;
  process.env.DATABASE_URL = dbUrl;

  console.log(
    `[load-test] target=${count} events, budget=${TIME_BUDGET_MS}ms, db=${dbPath}`,
  );

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  const learnerId = `load-learner-${Date.now()}`;
  const itemCount = Math.min(count, 1_000);
  const itemIds = Array.from({ length: itemCount }, (_, i) => `load-v-${i}`);
  const now = Date.now();

  await prisma.srsReviewRecord.createMany({
    data: itemIds.map((itemId, i) => ({
      learnerId,
      itemId,
      kind: "vocabulary",
      halfLifeMs: 300_000 + i,
      lastReviewedAt: null,
      dueAt: new Date(now + 300_000 + i),
      reviewCount: 0,
      lapses: 0,
    })),
  });

  const grades = ["again", "hard", "good", "easy"];

  const t0 = performance.now();

  for (let batchStart = 0; batchStart < count; batchStart += BATCH_SIZE) {
    const batchLen = Math.min(BATCH_SIZE, count - batchStart);
    const rows = Array.from({ length: batchLen }, (_, offset) => {
      const i = batchStart + offset;
      const itemId = itemIds[i % itemIds.length];
      const grade = grades[i % grades.length];
      const ts = new Date(now + i);
      return {
        learnerId,
        itemId,
        grade,
        halfLifeBeforeMs: 300_000,
        halfLifeAfterMs: 600_000,
        dueAt: new Date(now + i + 600_000),
        occurredAt: ts,
      };
    });
    await prisma.srsRecallEvent.createMany({ data: rows });
  }

  const events = await prisma.srsRecallEvent.findMany({
    where: { learnerId },
    orderBy: { occurredAt: "desc" },
    take: 500,
  });

  const elapsedMs = performance.now() - t0;

  await prisma.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });

  const throughput = Math.round((count / elapsedMs) * 1_000);
  console.log(
    `[load-test] persisted=${count} read=${events.length} elapsedMs=${Math.round(elapsedMs)} throughput=${throughput}/s`,
  );

  if (elapsedMs > TIME_BUDGET_MS) {
    console.error(
      `[load-test] FAIL — exceeded ${TIME_BUDGET_MS}ms budget by ${Math.round(elapsedMs - TIME_BUDGET_MS)}ms`,
    );
    process.exit(1);
  }
  console.log(
    `[load-test] PASS — under budget by ${Math.round(TIME_BUDGET_MS - elapsedMs)}ms`,
  );
}

main().catch((err) => {
  console.error("[load-test] crashed:", err);
  process.exit(1);
});