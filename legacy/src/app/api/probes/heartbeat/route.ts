import { NextResponse } from "next/server";
import { recordProbeHit, type ServiceId } from "@/lib/observability/health";

export const runtime = "nodejs";

export type ProbeHeartbeatRequest = {
  service?: string;
  ok?: boolean;
  region?: string;
  at?: number;
};

export type ProbeHeartbeatResponse = {
  ok: true;
  service: ServiceId;
  region: string;
  recordedAt: number;
};

const SERVICES: ReadonlyArray<ServiceId> = ["asr", "llm", "tts"];

export async function POST(request: Request): Promise<NextResponse> {
  let body: ProbeHeartbeatRequest;
  try {
    body = (await request.json()) as ProbeHeartbeatRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const service = body.service;
  if (!service || !SERVICES.includes(service as ServiceId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid service" },
      { status: 400 },
    );
  }
  const ok = body.ok !== false;
  const region = body.region?.trim() || "unknown";
  const at = typeof body.at === "number" ? body.at : Date.now();

  recordProbeHit(service as ServiceId, ok, region, at);

  const response: ProbeHeartbeatResponse = {
    ok: true,
    service: service as ServiceId,
    region,
    recordedAt: at,
  };
  return NextResponse.json(response);
}