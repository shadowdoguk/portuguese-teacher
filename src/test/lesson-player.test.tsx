import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { A0_CURRICULUM, type Lesson } from "@/lib/curriculum";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";

const originalFetch = global.fetch;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

function pickLesson(): Lesson {
  for (const unit of A0_CURRICULUM.units) {
    const lesson = unit.lessons[0];
    if (lesson && lesson.exercises.length > 0) return lesson;
  }
  throw new Error("No seeded lesson with exercises");
}

describe("LessonPlayer", () => {
  it("renders the lesson body, blocks, and authored exercises", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, state: { items: {} }, sources: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const lesson = pickLesson();
    render(<LessonPlayer lesson={lesson} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.getByText(lesson.title)).toBeInTheDocument();
    expect(screen.getByText(lesson.body.introduction)).toBeInTheDocument();
    const blocks = screen.getAllByTestId("lesson-block");
    expect(blocks.length).toBe(lesson.body.blocks.length);

    const authoredExercises = screen
      .getAllByTestId("lesson-exercise")
      .filter((node) => node.getAttribute("data-kind") === "authored");
    expect(authoredExercises.length).toBe(lesson.exercises.length);

    const summary = screen.getByTestId("lesson-stream-summary");
    expect(summary.textContent).toMatch(/0\/\d+ authored complete/);
    expect(summary.textContent).toMatch(/0 reviews injected/);
  });

  it("inserts at most maxInjected review items even when many are due", async () => {
    const vocabIds = ["a0-1-v-bom-dia", "a0-1-v-boa-noite", "a0-1-v-por-favor", "a0-1-v-obrigado", "a0-1-v-de-nada"];
    const refs: Record<string, { halfLifeMs: number; dueAt: number; reviewCount: number; lapses: number; lastReviewedAt: null }> = {};
    const now = 1_700_000_000_000;
    for (const id of vocabIds) {
      refs[id] = {
        halfLifeMs: 300_000,
        dueAt: now - 1_000,
        reviewCount: 0,
        lapses: 0,
        lastReviewedAt: null,
      };
    }
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, state: { items: refs }, sources: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const lesson = pickLesson();
    render(<LessonPlayer lesson={lesson} />);

    await waitFor(() => {
      const reviewItems = screen
        .getAllByTestId("lesson-exercise")
        .filter((node) => node.getAttribute("data-kind") === "review");
      expect(reviewItems.length).toBeGreaterThan(0);
      expect(reviewItems.length).toBeLessThanOrEqual(3);
    });
  });

  it("marks an authored exercise complete when the Mark done button is clicked", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, state: { items: {} }, sources: [] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const lesson = pickLesson();
    render(<LessonPlayer lesson={lesson} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("lesson-authored-mark-done").length).toBeGreaterThan(0);
    });
    const first = screen.getAllByTestId("lesson-authored-mark-done")[0]!;
    first.click();

    await waitFor(() => {
      const summary = screen.getByTestId("lesson-stream-summary");
      expect(summary.textContent).toMatch(/1\/\d+ authored complete/);
    });
  });

  it("sends the recall payload when a review grade button is clicked", async () => {
    const ref = {
      halfLifeMs: 300_000,
      dueAt: 1_700_000_000_000 - 1_000,
      reviewCount: 0,
      lapses: 0,
      lastReviewedAt: null,
    };
    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/srs/state")) {
        return new Response(
          JSON.stringify({ ok: true, state: { items: { "a0-1-v-bom-dia": ref } }, sources: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/api/srs/recalls")) {
        return new Response(
          JSON.stringify({
            ok: true,
            record: { ...ref, halfLifeMs: 750_000, dueAt: 1_700_000_750_000, reviewCount: 1 },
            event: {
              event: "srs_recall",
              learnerId: "demo-learner",
              itemId: "a0-1-v-bom-dia",
              grade: "good",
              halfLifeBeforeMs: 300_000,
              halfLifeAfterMs: 750_000,
              dueAt: 1_700_000_750_000,
              timestamp: 1_700_000_000_000,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(null, { status: 404 });
    });

    const lesson = pickLesson();
    render(<LessonPlayer lesson={lesson} />);

    await waitFor(() => {
      expect(
        screen.getAllByTestId("lesson-review-grade-good").length,
      ).toBeGreaterThan(0);
    });
    const goodBtn = screen.getAllByTestId("lesson-review-grade-good")[0]!;
    goodBtn.click();

    await waitFor(() => {
      const recallCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes("/api/srs/recalls"),
      );
      expect(recallCall).toBeDefined();
      const init = recallCall?.[1] as RequestInit | undefined;
      const body = JSON.parse(String(init?.body ?? "{}")) as { itemId: string; grade: string };
      expect(body.itemId).toBe("a0-1-v-bom-dia");
      expect(body.grade).toBe("good");
    });
  });
});