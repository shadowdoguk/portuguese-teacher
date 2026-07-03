// Pins WCAG 2.2 SC 3.1.1 Language of Page (issue #123).
//
// The platform's predominant content is pt-PT (AI teacher turns,
// vocabulary, scenario dialogue, lesson body). The UI chrome is English
// but the content layer is pt-PT. The <html lang> attribute should
// reflect the content language so screen readers speak Portuguese
// (not English-with-Portuguese-words) when reading teacher turns.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("<html lang> contract (issue #123)", () => {
  it("RootLayout declares lang=pt-PT", () => {
    const layoutPath = join(
      process.cwd(),
      "src/app/layout.tsx",
    );
    const src = readFileSync(layoutPath, "utf-8");
    // The lang attribute on <html> must be pt-PT, not en, so screen
    // readers pick Portuguese pronunciation for AI teacher turns.
    expect(src).toMatch(/<html[\s\S]*lang="pt-PT"[\s\S]*>/);
    expect(src).not.toMatch(/<html[\s\S]*lang="en"[\s\S]*>/);
  });
});