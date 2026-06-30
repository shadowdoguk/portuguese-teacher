import { test, expect } from "@playwright/test";
import { signInAsDemoLearner } from "./fixtures";

const PORTUGUESE_UTTERANCES = [
  "Olá",
  "Bom dia, como estás?",
  "Eu sou estudante de português",
  "Onde está o café?",
  "Quero um café, por favor",
  "Obrigado",
  "Adeus",
  "Até logo",
  "Como te chamas?",
  "Prazer em conhecer-te",
];

test.describe("Conversational Practice — 10-turn smoke", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemoLearner(page);
  });

  test("completes a 10-turn conversation and renders the turn history", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByTestId("practice-session")).toBeVisible();

    await expect(page.getByTestId("tier-badge")).toBeVisible();

    const session = page.getByTestId("practice-session");
    const teacherBubbles = session.locator(
      '[data-testid^="teacher-bubble-turn-"]:not([data-testid$="-audio"]):not([data-testid$="-replay"])',
    );

    const tier = await page.getByTestId("tier-badge").getAttribute("data-tier");
    const utteranceBox = page.getByTestId("learner-utterance").first();
    const sendButton = page.getByTestId("send-turn").first();

    if (tier === "1" || tier === "2") {
      await session.locator("details").first().evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    }

    for (let i = 0; i < PORTUGUESE_UTTERANCES.length; i++) {
      await utteranceBox.scrollIntoViewIfNeeded();
      await utteranceBox.fill(PORTUGUESE_UTTERANCES[i]!);
      await expect(sendButton).toBeEnabled();
      await sendButton.click();
      await expect(teacherBubbles).toHaveCount(i + 1, { timeout: 15_000 });
    }

    await expect(teacherBubbles).toHaveCount(10);
    await expect(session.locator("text=/Target \\d\\.\\d{2}/")).toBeVisible();
  });

  test("p95 voice-loop turn latency on Tier 1 (mock mode) is within budget", async ({ request }) => {
    const samples: number[] = [];
    const iterations = 20;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const response = await request.post("/api/voice-loop/turn", {
        data: {
          learnerText: PORTUGUESE_UTTERANCES[i % PORTUGUESE_UTTERANCES.length],
          tier: 1,
          practiceMode: "free-form",
          difficultyTarget: 1.0,
          utteranceId: `e2e-perf-${i}`,
          learnerLevel: "A0",
        },
      });
      const elapsed = Date.now() - start;
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { ok: boolean; latencyMs: number; path: string };
      expect(body.ok).toBe(true);
      expect(body.path).toMatch(/^rerank|runTurn$/);
      samples.push(elapsed);
    }

    samples.sort((a, b) => a - b);
    const p95Index = Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1);
    const p95 = samples[p95Index]!;

    expect(p95, `p95 wall-clock latency must be ≤ 1500 ms (mock mode)`).toBeLessThanOrEqual(1500);
  });

  test("i+1 difficulty target renders on the Live turn card", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByTestId("practice-session")).toBeVisible();

    const initialTarget = await page
      .getByTestId("practice-session")
      .locator("text=/Target \\d\\.\\d{2}/")
      .first()
      .textContent();
    expect(initialTarget).toBeTruthy();

    const session = page.getByTestId("practice-session");
    const utteranceBox = page.getByTestId("learner-utterance").first();
    const sendButton = page.getByTestId("send-turn").first();
    const tier = await page.getByTestId("tier-badge").getAttribute("data-tier");

    if (tier === "1" || tier === "2") {
      await session.locator("details").first().evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
    }

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/voice-loop/turn") && response.status() === 200,
    );

    await utteranceBox.scrollIntoViewIfNeeded();
    await utteranceBox.fill("olá");
    await sendButton.click();

    await responsePromise;

    await expect(
      session.locator(
        '[data-testid^="teacher-bubble-turn-"]:not([data-testid$="-audio"]):not([data-testid$="-replay"])',
      ),
    ).toHaveCount(1);
  });
});