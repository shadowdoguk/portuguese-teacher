import type { PrismaClient } from "@prisma/client";

export const SC5_RETENTION_LABEL = "24h-hard-delete";

export type Sc5RetentionSweepResult = {
  deleted: number;
  cutoff: Date;
  dryRun: boolean;
};

export async function runRetentionSweep(
  prisma: PrismaClient,
  options: { now?: Date; retentionHours?: number; dryRun?: boolean } = {},
): Promise<Sc5RetentionSweepResult> {
  const now = options.now ?? new Date();
  const retentionHours = options.retentionHours ?? 24;
  const cutoff = new Date(now.getTime() - retentionHours * 60 * 60 * 1000);

  if (options.dryRun) {
    const count = await prisma.sc5Sample.count({
      where: { createdAt: { lt: cutoff } },
    });
    return { deleted: count, cutoff, dryRun: true };
  }

  const result = await prisma.sc5Sample.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return { deleted: result.count, cutoff, dryRun: false };
}