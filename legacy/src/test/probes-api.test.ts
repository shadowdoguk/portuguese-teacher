import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postHeartbeat } from "@/app/api/probes/heartbeat/route";
import { GET as getAvailability } from "@/app/api/probes/availability/route";
import { resetHealthStateForTests } from "@/lib/observability/health";

beforeEach(() => {
  resetHealthStateForTests();
});

afterEach(() => {
  resetHealthStateForTests();
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/probes/heartbeat", () => {
  it("rejects malformed JSON", async () => {
    const res = await postHeartbeat(
      new Request("http://localhost/api/probes/heartbeat", {
        method: "POST",
        body: "{not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid service", async () => {
    const res = await postHeartbeat(
      jsonRequest("http://localhost/api/probes/heartbeat", { service: "bogus", ok: true, region: "eu-west" }),
    );
    expect(res.status).toBe(400);
  });

  it("records a successful probe and returns 200", async () => {
    const res = await postHeartbeat(
      jsonRequest("http://localhost/api/probes/heartbeat", {
        service: "asr",
        ok: true,
        region: "eu-west",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string; region: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("asr");
    expect(body.region).toBe("eu-west");
  });

  it("records a failed probe as a 'down' health state", async () => {
    await postHeartbeat(
      jsonRequest("http://localhost/api/probes/heartbeat", {
        service: "tts",
        ok: false,
        region: "us-east",
      }),
    );
    const res = await getAvailability(
      new Request("http://localhost/api/probes/availability"),
    );
    const body = (await res.json()) as {
      ok: boolean;
      services: Array<{ service: string; upPercent: number; sampleCount: number }>;
    };
    expect(body.ok).toBe(true);
    const tts = body.services.find((s) => s.service === "tts");
    expect(tts).toBeDefined();
    expect(tts?.upPercent).toBeLessThan(100);
    expect(tts?.sampleCount).toBeGreaterThanOrEqual(2);
  });

  it("defaults region to 'unknown' when missing", async () => {
    const res = await postHeartbeat(
      jsonRequest("http://localhost/api/probes/heartbeat", { service: "llm", ok: true }),
    );
    const body = (await res.json()) as { region: string };
    expect(body.region).toBe("unknown");
  });
});

describe("GET /api/probes/availability", () => {
  it("rejects a non-positive windowMs", async () => {
    const res = await getAvailability(
      new Request("http://localhost/api/probes/availability?windowMs=0"),
    );
    expect(res.status).toBe(400);
  });

  it("returns availability for all three services", async () => {
    const res = await getAvailability(
      new Request("http://localhost/api/probes/availability"),
    );
    const body = (await res.json()) as {
      ok: boolean;
      services: Array<{ service: string; upPercent: number; sampleCount: number }>;
    };
    expect(body.ok).toBe(true);
    expect(body.services.map((s) => s.service).sort()).toEqual(["asr", "llm", "tts"]);
  });
});