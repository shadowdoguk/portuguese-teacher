import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runRetentionSweep } from "@/lib/sc5";

const prisma = new PrismaClient();

describe("SC-5 retention sweep", () => {
  beforeEach(async () => {
    await prisma.sc5Sample.deleteMany({});
  });

  afterEach(async () => {
    await prisma.sc5Sample.deleteMany({});
  });

  it("hard-deletes rows older than 24 h", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    await prisma.sc5Sample.createMany({
      data: [
        { utteranceId: "u-fresh", audioBlobUrl: "blob:fresh", createdAt: oneHourAgo },
        { utteranceId: "u-old", audioBlobUrl: "blob:old", createdAt: twentyFiveHoursAgo },
      ],
    });

    const result = await runRetentionSweep(prisma, { now });
    expect(result.deleted).toBe(1);
    expect(result.cutoff.toISOString()).toBe("2026-06-29T12:00:00.000Z");
    expect(result.dryRun).toBe(false);

    const remaining = await prisma.sc5Sample.findMany();
    expect(remaining.map((r) => r.utteranceId)).toEqual(["u-fresh"]);
  });

  it("dry-run reports the count without deleting", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);

    await prisma.sc5Sample.createMany({
      data: [
        { utteranceId: "u-1", audioBlobUrl: "blob:1", createdAt: thirtyHoursAgo },
        { utteranceId: "u-2", audioBlobUrl: "blob:2", createdAt: thirtyHoursAgo },
        { utteranceId: "u-3", audioBlobUrl: "blob:3", createdAt: now },
      ],
    });

    const result = await runRetentionSweep(prisma, { now, dryRun: true });
    expect(result.deleted).toBe(2);
    expect(result.dryRun).toBe(true);

    const remaining = await prisma.sc5Sample.count();
    expect(remaining).toBe(3);
  });

  it("idempotent — second sweep deletes nothing", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const twentySixHoursAgo = new Date(now.getTime() - 26 * 60 * 60 * 1000);

    await prisma.sc5Sample.create({
      data: { utteranceId: "u-stale", audioBlobUrl: "blob:stale", createdAt: twentySixHoursAgo },
    });

    const first = await runRetentionSweep(prisma, { now });
    const second = await runRetentionSweep(prisma, { now });
    expect(first.deleted).toBe(1);
    expect(second.deleted).toBe(0);
  });

  it("respects a custom retention window", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    await prisma.sc5Sample.create({
      data: { utteranceId: "u-3h", audioBlobUrl: "blob:3h", createdAt: threeHoursAgo },
    });

    const result = await runRetentionSweep(prisma, { now, retentionHours: 2 });
    expect(result.deleted).toBe(1);
  });
});