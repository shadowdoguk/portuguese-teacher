#!/usr/bin/env tsx
/**
 * SC-5 retention sweep — issue #16.
 *
 * Runs the 24 h hard-delete sweep against the live database. Intended for cron
 * / scheduled-job invocation in production (Vercel cron, k8s CronJob, etc.).
 *
 * Usage:
 *   pnpm tsx scripts/sc5-retention.ts           # live sweep
 *   pnpm tsx scripts/sc5-retention.ts --dry-run # count only
 */
import { PrismaClient } from "@prisma/client";
import { runRetentionSweep, SC5_RETENTION_LABEL } from "../src/lib/sc5";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runRetentionSweep(prisma, { dryRun });
  console.log(
    `[sc5-retention:${SC5_RETENTION_LABEL}] ${dryRun ? "dry-run" : "live"} sweep: deleted=${result.deleted} cutoff=${result.cutoff.toISOString()}`,
  );
  if (!dryRun && result.deleted > 0) {
    console.log(`[sc5-retention] hard-deleted ${result.deleted} Sc5Sample rows`);
  }
}

main()
  .catch((err: unknown) => {
    console.error("[sc5-retention] crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });