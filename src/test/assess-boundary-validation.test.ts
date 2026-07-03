// Pins the boundary-validation contract used by /assess/[boundary].
// Server-side guard (`src/app/(app)/assess/[boundary]/page.tsx` line 36) calls
// these helpers to gate invalid URLs to HTTP 404.
import { describe, it, expect } from "vitest";
import { isLevelBoundary, milestoneByBoundary } from "@/lib/assessment";
import { A0_CURRICULUM, type LevelBoundary } from "@/lib/curriculum";

describe("assess boundary validation (issue #120)", () => {
  describe("isLevelBoundary", () => {
    it("accepts the three canonical lowercase boundaries", () => {
      expect(isLevelBoundary("A0-A1")).toBe(true);
      expect(isLevelBoundary("A1-A2")).toBe(true);
      expect(isLevelBoundary("A2-B1")).toBe(true);
    });

    it("rejects invalid boundaries", () => {
      expect(isLevelBoundary("x0-x1")).toBe(false);
      expect(isLevelBoundary("foo-bar")).toBe(false);
      expect(isLevelBoundary("A99-Z9")).toBe(false);
      expect(isLevelBoundary("")).toBe(false);
      expect(isLevelBoundary("a0-a1")).toBe(false); // case-sensitive
    });
  });

  describe("milestoneByBoundary", () => {
    it("returns the seeded A0-A1 milestone", () => {
      const milestone = milestoneByBoundary(A0_CURRICULUM, "A0-A1");
      expect(milestone).toBeDefined();
      expect(milestone?.boundary).toBe("A0-A1");
    });

    it("returns undefined for boundaries whose milestone is not seeded", () => {
      // v1 ships only the A0-A1 milestone (A1-A2 + A2-B1 land in v1.1 content).
      // Pinning this so the server component 404s the right URLs.
      expect(milestoneByBoundary(A0_CURRICULUM, "A1-A2" as LevelBoundary)).toBeUndefined();
      expect(milestoneByBoundary(A0_CURRICULUM, "A2-B1" as LevelBoundary)).toBeUndefined();
    });
  });
});