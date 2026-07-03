// E2E regression: /assess/[boundary] returns HTTP 404 for invalid boundaries
// (issue #120). Server-side validation gates invalid milestone URLs.
import { test, expect } from "@playwright/test";

test.describe("Assess boundary validation", () => {
  test("invalid boundaries return HTTP 404", async ({ request }) => {
    for (const invalid of ["x0-x1", "foo-bar", "A99-Z9", "0-1", ""]) {
      const res = await request.get(`/assess/${invalid}`);
      expect(
        res.status(),
        `expected /assess/${invalid} to be 404, got ${res.status()}`,
      ).toBe(404);
    }
  });

  test("valid lowercase boundaries return HTTP 200", async ({ request }) => {
    for (const valid of ["a0-a1", "a1-a2", "a2-b1"]) {
      const res = await request.get(`/assess/${valid}`);
      expect(
        res.status(),
        `expected /assess/${valid} to be 200, got ${res.status()}`,
      ).toBe(200);
    }
  });

  test("uppercase canonicalises to lowercase (still HTTP 200)", async ({ request }) => {
    for (const valid of ["A0-A1", "A1-A2", "A2-B1"]) {
      const res = await request.get(`/assess/${valid}`);
      // Server component normalises case before validation, so uppercase is accepted.
      expect(
        res.status(),
        `expected /assess/${valid} to canonicalise to 200, got ${res.status()}`,
      ).toBe(200);
    }
  });
});