import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import { PrismaClient } from "@prisma/client";
import { POST as postComplete } from "@/app/api/scenarios/[id]/complete/route";
import { GET as getState } from "@/app/api/srs/state/route";
import { ScenarioOriginsTile } from "@/components/progress/ScenarioOriginsTile";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-scenario-sources-"));
  const dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync(`pnpm exec prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
}, 60000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  vi.restoreAllMocks();
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scenarios/[id]/complete — scenario vocabulary injection", () => {
  it("records vocabularyRefs as SrsItemSource rows", async () => {
    const learnerId = `learner-${Date.now()}-cafe`;
    const res = await postComplete(
      jsonRequest("http://localhost/api/scenarios/s-cafe-1-pedir-basico/complete", {
        learnerId,
        passed: true,
        stars: 3,
        turnsTaken: 4,
        completedAt: 1_700_000_000_000,
      }),
      { params: { id: "s-cafe-1-pedir-basico" } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; recordedSources: number };
    expect(body.ok).toBe(true);
    expect(body.recordedSources).toBe(3);

    const sources = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(sources).toHaveLength(3);
    const itemIds = sources.map((s) => s.itemId).sort();
    expect(itemIds).toEqual(["a0-3-v-agua", "a0-3-v-cafe", "a0-3-v-pastel-nata"]);
  });

  it("records zero sources for a scenario with no vocabularyRefs", async () => {
    const learnerId = `learner-${Date.now()}-greetings`;
    const res = await postComplete(
      jsonRequest("http://localhost/api/scenarios/s-greetings-3-despedida-formal/complete", {
        learnerId,
        passed: true,
        stars: 2,
        turnsTaken: 3,
        completedAt: 1_700_000_000_000,
      }),
      { params: { id: "s-greetings-3-despedida-formal" } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recordedSources: number };
    expect(body.recordedSources).toBe(0);
  });
});

describe("GET /api/srs/state — scenario source surfacing", () => {
  it("returns empty sources when the learner has no scenario completions", async () => {
    const learnerId = `learner-${Date.now()}-nosources`;
    const res = await getState(
      new Request(`http://localhost/api/srs/state?learnerId=${learnerId}`),
    );
    const body = (await res.json()) as {
      ok: boolean;
      sources: Array<{ itemId: string; sourceScenarioId: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.sources).toEqual([]);
  });

  it("returns the recorded sources for a learner with a completed scenario", async () => {
    const learnerId = `learner-${Date.now()}-withsources`;
    await postComplete(
      jsonRequest("http://localhost/api/scenarios/s-cafe-1-pedir-basico/complete", {
        learnerId,
        passed: true,
        stars: 3,
        turnsTaken: 5,
        completedAt: 1_700_000_000_000,
      }),
      { params: { id: "s-cafe-1-pedir-basico" } },
    );
    const res = await getState(
      new Request(`http://localhost/api/srs/state?learnerId=${learnerId}`),
    );
    const body = (await res.json()) as {
      ok: boolean;
      sources: Array<{ itemId: string; sourceScenarioId: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.sources.length).toBe(3);
    for (const source of body.sources) {
      expect(source.sourceScenarioId).toBe("s-cafe-1-pedir-basico");
    }
  });
});

describe("ScenarioOriginsTile", () => {
  it("renders the empty-state copy when no scenario sources exist", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, state: { items: {} }, sources: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    render(<ScenarioOriginsTile learnerId="learner-empty" />);
    await waitFor(() => {
      expect(screen.getByTestId("scenario-origins-detail")).toHaveAttribute(
        "data-status",
        "empty",
      );
    });
    expect(screen.getByText(/Complete a scenario/)).toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it("renders one row per distinct scenario with the item count", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          state: { items: {} },
          sources: [
            { itemId: "a0-3-v-pastel-nata", sourceScenarioId: "s-cafe-1" },
            { itemId: "a0-3-v-cafe", sourceScenarioId: "s-cafe-1" },
            { itemId: "a0-3-v-agua", sourceScenarioId: "s-cafe-1" },
            { itemId: "a0-1-v-bom-dia", sourceScenarioId: "s-greetings-1" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<ScenarioOriginsTile learnerId="learner-multi" />);
    await waitFor(() => {
      expect(screen.getAllByTestId("scenario-origin-row")).toHaveLength(2);
    });
    const rows = screen.getAllByTestId("scenario-origin-row");
    expect(rows[0]?.getAttribute("data-scenario-id")).toBe("s-cafe-1");
    expect(rows[0]?.textContent).toMatch(/3/);
    expect(rows[1]?.getAttribute("data-scenario-id")).toBe("s-greetings-1");
    expect(rows[1]?.textContent).toMatch(/1/);
    fetchMock.mockRestore();
  });
});