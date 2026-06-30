import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSc5Health } from "@/lib/sc5";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export async function GET(): Promise<NextResponse> {
  const snapshot = await getSc5Health(prisma());
  return NextResponse.json(snapshot);
}