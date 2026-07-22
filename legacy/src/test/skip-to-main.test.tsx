// Pins the WCAG 2.2 SC 2.4.1 Bypass Blocks contract (issue #122).
//
// 1. A skip-to-main-content link is the first focusable element on every
//    page (the standard "skip link" pattern).
// 2. The link is visually hidden by default (sr-only) but visible on
//    focus (focus:not-sr-only).
// 3. Activating the link moves focus to the `<main id="main">` landmark.
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SkipToMain } from "@/components/a11y/SkipToMain";

describe("SkipToMain (issue #122)", () => {
  it("renders a link to #main", () => {
    render(
      <div>
        <SkipToMain />
        <main id="main" tabIndex={-1}>
          content
        </main>
      </div>,
    );

    const link = screen.getByTestId("skip-to-main");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("#main");
    expect(link.textContent).toBe("Skip to main content");
  });

  it("is visually hidden by default (sr-only) and visible on focus", () => {
    render(
      <div>
        <SkipToMain />
        <main id="main">content</main>
      </div>,
    );

    const link = screen.getByTestId("skip-to-main");
    const className = link.className;
    expect(className).toContain("sr-only");
    expect(className).toContain("focus:not-sr-only");
    expect(className).toContain("focus:fixed");
  });

  it("clicking the link focuses the main landmark", () => {
    render(
      <div>
        <SkipToMain />
        <main id="main" data-testid="main-target">
          content
        </main>
      </div>,
    );

    const link = screen.getByTestId("skip-to-main");
    const target = screen.getByTestId("main-target");

    fireEvent.click(link);
    expect(target).toHaveFocus();
    // tabindex is added so focus can land, then removed on blur so it
    // doesn't trap future tab orders.
    expect(target.getAttribute("tabindex")).toBe("-1");
  });
});