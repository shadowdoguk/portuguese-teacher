// Pins the footer link IA (issue #125).
//
// Each footer link should go to its own topic. The Legal column's
// "Accessibility" label currently points to /settings; it should
// point to /accessibility (the dedicated WCAG 2.2 AA statement
// introduced in PR #84).
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";

describe("Footer links (issue #125)", () => {
  it("'Accessibility' link points to /accessibility, not /settings", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /^Accessibility$/ });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/accessibility");
    expect(link.getAttribute("href")).not.toBe("/settings");
  });

  it("'Privacy & data' link points to /settings", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /Privacy & data/ });
    expect(link.getAttribute("href")).toBe("/settings");
  });

  it("'Settings' link points to /settings", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /^Settings$/ });
    expect(link.getAttribute("href")).toBe("/settings");
  });
});