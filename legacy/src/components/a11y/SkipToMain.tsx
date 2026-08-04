"use client";

import { type MouseEvent } from "react";

/**
 * "Skip to main content" link — WCAG 2.2 SC 2.4.1 Bypass Blocks.
 *
 * Mounted as the first focusable element on every page. Visually
 * hidden by default; revealed on focus (the standard "skip link"
 * pattern). When activated, focuses the `<main id="main">` landmark
 * so keyboard / screen-reader users can jump past the sticky header
 * + sidebar without tabbing through every nav link.
 *
 * Issue #122. The page-level `<main>` elements all carry
 * `id="main"`; the link's `href="#main"` is the standard
 * fragment-target for that id.
 */
export function SkipToMain() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const target = document.getElementById("main");
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus();
      // Remove tabindex after focus to avoid trapping future tab orders
      target.addEventListener(
        "blur",
        () => {
          target.removeAttribute("tabindex");
        },
        { once: true },
      );
    }
  }

  return (
    <a
      href="#main"
      onClick={handleClick}
      data-testid="skip-to-main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-terracotta"
    >
      Skip to main content
    </a>
  );
}