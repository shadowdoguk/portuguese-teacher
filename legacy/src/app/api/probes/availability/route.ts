import { NextResponse } from "next/server";
import {
  getServiceAvailability,
  type ServiceAvailability,
} from "@/lib/observability/health";

export const runtime = "nodejs";

export type ProbesAvailabilityResponse = {
  ok: true;
  windowMs: number;
  services: ReadonlyArray<ServiceAvailability>;
};

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const windowParam = url.searchParams.get("windowMs");
  let windowMs = 30 * 24 * 60 * 60 * 1000;
  if (windowParam) {
    const parsed = Number.parseInt(windowParam, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid windowMs" },
        { status: 400 },
      );
    }
    windowMs = Math.min(windowMs, parsed);
  }
  const services: ServiceAvailability[] = (["asr", "llm", "tts"] as const).map(
    (service) => getServiceAvailability(service, windowMs),
  );
  return NextResponse.json({ ok: true, windowMs, services });
}