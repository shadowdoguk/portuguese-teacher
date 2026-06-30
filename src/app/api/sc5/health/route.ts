import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSc5Health } from "@/lib/sc5";

export const runtime = "nodejs";
// Force the route out of Next.js's prerender pass. The SC-5 health
// snapshot queries the live database, which is not safe to evaluate at
// build time (the dev.db file may not exist in CI). The route serves
// requests dynamically on every GET.
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(): Promise<NextResponse> {
  const snapshot = await getSc5Health(prisma);
  return NextResponse.json(snapshot);
}