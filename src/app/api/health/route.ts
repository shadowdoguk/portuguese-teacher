import { NextResponse } from "next/server";
import { getHealthSnapshot, type HealthSnapshot } from "@/lib/observability/health";

export const runtime = "nodejs";

export type HealthResponse = HealthSnapshot;

export async function GET(): Promise<NextResponse<HealthResponse>> {
  return NextResponse.json(getHealthSnapshot());
}