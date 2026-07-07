// E2E regression: /assess/[boundary] returns HTTP 404 for invalid boundaries
// (issue #120). Server-side validation gates invalid milestone URLs and
// boundary names without a registered milestone.
import { test, expect } from "@playwright/test";

test.describe("Assess boundary validation", () => {
  test("invalid boundary names return HTTP 404", async ({ request }) => {
    for (const invalid of ["x0-x1", "foo-bar", "A99-Z9", "0-1", ""]) {
      const res = await request.get(`/assess/${invalid}`);
      expect(
        res.status(),
        `expected /assess/${invalid} to be 404, got ${res.status()}`,
      ).toBe(404);
    }
  });

  test("valid boundaries with a registered milestone return HTTP 200", async ({ request }) => {
    // Only `a0-a1` is seeded with a milestone today (see seed-a0.ts).
    // PR #126 made A1-A2 / A2-B1 return 404 because no milestone is
    // registered for those boundaries in the current curriculum.
    for (const valid of ["a0-a1"]) {
      const res = await request.get(`/assess/${valid}`);
      expect(
        res.status(),
        `expected /assess/${valid} to be 200, got ${res.status()}`,
      ).toBe(200);
    }
  });

  test("uppercase boundary with a registered milestone canonicalises to 200", async ({ request }) => {
    // Server component normalises case before validation; uppercase is accepted
    // for boundaries that have a registered milestone.
    for (const valid of ["A0-A1"]) {
      const res = await request.get(`/assess/${valid}`);
      expect(
        res.status(),
        `expected /assess/${valid} to canonicalise to 200, got ${res.status()}`,
      ).toBe(200);
    }
  });

  test("valid boundary names without a registered milestone return HTTP 404", async ({ request }) => {
    // PR #126 #120 follow-up: A1-A2 and A2-B1 have no milestone seeded in
    // A0_CURRICULUM today, so the route 404s. This is the intended behaviour
    // per `docs/agents/` decisions log (the 500 from collectAssessmentPool
    // was the original #120 symptom).
    for (const missing of ["a1-a2", "A1-A2", "a2-b1", "A2-B1"]) {
      const res = await request.get(`/assess/${missing}`);
      expect(
        res.status(),
        `expected /assess/${missing} to be 404 (no milestone), got ${res.status()}`,
      ).toBe(404);
    }
  });
});
