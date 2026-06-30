import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSc5Health } from "@/lib/sc5";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET(): Promise<NextResponse> {
  const snapshot = await getSc5Health(prisma);
  return NextResponse.json(snapshot);
}