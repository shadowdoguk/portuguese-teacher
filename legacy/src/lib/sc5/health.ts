import { PrismaClient } from "@prisma/client";

export type Sc5HealthSnapshot = {
  sampleCount: number;
  oldestCreatedAt: string | null;
  oldestAgeHours: number | null;
  withinRetentionHours: number;
  oldestAgeExceedsRetention: boolean;
  takenAt: string;
};

export async function getSc5Health(
  prisma: PrismaClient,
  options: { now?: Date; retentionHours?: number } = {},
): Promise<Sc5HealthSnapshot> {
  const now = options.now ?? new Date();
  const retentionHours = options.retentionHours ?? 24;

  const [sampleCount, oldest] = await Promise.all([
    prisma.sc5Sample.count(),
    prisma.sc5Sample.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const oldestCreatedAt = oldest?.createdAt.toISOString() ?? null;
  const oldestAgeHours = oldest
    ? (now.getTime() - oldest.createdAt.getTime()) / (60 * 60 * 1000)
    : null;
  const oldestAgeExceedsRetention =
    oldestAgeHours !== null && oldestAgeHours > retentionHours;

  return {
    sampleCount,
    oldestCreatedAt,
    oldestAgeHours,
    withinRetentionHours: retentionHours,
    oldestAgeExceedsRetention,
    takenAt: now.toISOString(),
  };
}