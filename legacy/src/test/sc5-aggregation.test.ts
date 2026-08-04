import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { aggregateWeeklyWer } from "@/lib/sc5";

const prisma = new PrismaClient();

describe("SC-5 weekly WER aggregation", () => {
  beforeEach(async () => {
    await prisma.sc5Sample.deleteMany({});
  });

  afterEach(async () => {
    await prisma.sc5Sample.deleteMany({});
  });

  it("produces a WER figure across the held-out reference transcripts", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    await prisma.sc5Sample.createMany({
      data: [
        {
          utteranceId: "u-perfect",
          audioBlobUrl: "blob:perfect",
          createdAt: sixDaysAgo,
        },
        {
          utteranceId: "u-half",
          audioBlobUrl: "blob:half",
          createdAt: sixDaysAgo,
        },
        {
          utteranceId: "u-zero",
          audioBlobUrl: "blob:zero",
          createdAt: sixDaysAgo,
        },
      ],
    });

    const report = await aggregateWeeklyWer(prisma, {
      now,
      heldOutAsr: async (audioBlobUrl) => {
        if (audioBlobUrl === "blob:perfect") {
          return {
            transcript: "bom dia como estás",
            confidence: 0.99,
            bucket: "clean",
            refTranscript: "bom dia como estás",
          };
        }
        if (audioBlobUrl === "blob:half") {
          return {
            transcript: "bom como",
            confidence: 0.7,
            bucket: "noisy",
            refTranscript: "bom dia como estás",
          };
        }
        return {
          transcript: "",
          confidence: 0,
          bucket: "clean",
          refTranscript: "bom dia como estás",
        };
      },
    });

    expect(report.sampleCount).toBe(3);
    expect(report.transcribedCount).toBe(3);
    // 12 ref words total, edits = 0 + 2 + 4 = 6 → WER 0.5
    expect(report.refWords).toBe(12);
    expect(report.edits).toBe(6);
    expect(report.wer).toBeCloseTo(0.5, 2);
    expect(report.bucketSummary.find((b) => b.bucket === "clean")?.wer).toBeCloseTo(0.5, 2);
    expect(report.bucketSummary.find((b) => b.bucket === "noisy")?.wer).toBeCloseTo(0.5, 2);
  });

  it("returns zero WER when no samples are in the window", async () => {
    const report = await aggregateWeeklyWer(prisma, {
      now: new Date("2026-06-30T12:00:00Z"),
      heldOutAsr: async () => {
        throw new Error("not reached");
      },
    });
    expect(report.sampleCount).toBe(0);
    expect(report.transcribedCount).toBe(0);
    expect(report.wer).toBe(0);
  });

  it("skips samples whose held-out ASR throws", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await prisma.sc5Sample.createMany({
      data: [
        { utteranceId: "u-ok", audioBlobUrl: "blob:ok", createdAt: oneDayAgo },
        { utteranceId: "u-broken", audioBlobUrl: "blob:broken", createdAt: oneDayAgo },
      ],
    });

    const report = await aggregateWeeklyWer(prisma, {
      now,
      heldOutAsr: async (url) => {
        if (url === "blob:broken") throw new Error("ASR unreachable");
        return {
          transcript: "olá",
          confidence: 0.9,
          bucket: "clean",
          refTranscript: "olá",
        };
      },
    });

    expect(report.transcribedCount).toBe(1);
    expect(report.wer).toBe(0);
  });

  it("populates transcript + confidence on the Sc5Sample row when missing", async () => {
    const now = new Date("2026-06-30T12:00:00Z");
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await prisma.sc5Sample.create({
      data: { utteranceId: "u-blank", audioBlobUrl: "blob:blank", createdAt: twoDaysAgo },
    });

    await aggregateWeeklyWer(prisma, {
      now,
      heldOutAsr: async () => ({
        transcript: "olá mundo",
        confidence: 0.95,
        bucket: "clean",
        refTranscript: "olá mundo",
      }),
    });

    const row = await prisma.sc5Sample.findUnique({ where: { utteranceId: "u-blank" } });
    expect(row?.transcript).toBe("olá mundo");
    expect(row?.confidence).toBeCloseTo(0.95);
  });
});