import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { SiteHeader } from "@/components/layout/SiteHeader";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SiteHeader variant="app" />
      </SettingsProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  // Plant a session so AppNav renders the authed chrome
  window.localStorage.setItem(
    "portuguese-teacher:user",
    JSON.stringify({ id: "test-user", name: "Test", email: "t@example.com" }),
  );
});

describe("SiteHeader AppNav responsive (issue #112)", () => {
  it("desktop (>= md): inline Dashboard / Practice / Review links are visible", () => {
    // jsdom defaults to 1024px wide — comfortably above the md breakpoint (768)
    render(<Harness />);
    const dashboardLinks = screen.getAllByRole("link", { name: /^Dashboard$/ });
    const practiceLinks = screen.getAllByRole("link", { name: /^Practice$/ });
    const reviewLinks = screen.getAllByRole("link", { name: /^Review$/ });
    // At least one set of each should be present (the desktop inline + the mobile menu both render the link element,
    // but only the inline ones are visible by CSS). We assert presence; visibility is CSS-driven.
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(practiceLinks.length).toBeGreaterThanOrEqual(1);
    expect(reviewLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the mobile <details> toggle with data-testid='appnav-mobile-toggle'", () => {
    render(<Harness />);
    const toggle = screen.getByTestId("appnav-mobile-toggle");
    expect(toggle).toBeInTheDocument();
    // The toggle carries an aria-label for SR users
    expect(toggle).toHaveAttribute("aria-label", "Open menu");
  });

  it("renders the mobile menu container with data-testid='appnav-mobile-menu'", () => {
    render(<Harness />);
    const menu = screen.getByTestId("appnav-mobile-menu");
    expect(menu).toBeInTheDocument();
  });

  it("mobile menu includes Dashboard, Practice, Review, Profile, and a Sign out control", () => {
    render(<Harness />);
    const menu = screen.getByTestId("appnav-mobile-menu");
    // All four nav links live inside the mobile menu
    expect(menu.querySelector('a[href="/dashboard"]')).toBeInTheDocument();
    expect(menu.querySelector('a[href="/practice"]')).toBeInTheDocument();
    expect(menu.querySelector('a[href="/review"]')).toBeInTheDocument();
    expect(menu.querySelector('a[href="/profile"]')).toBeInTheDocument();
    // Sign out is a <button> inside the menu
    expect(menu.querySelector('button[aria-label="Sign out"]')).toBeInTheDocument();
  });

  it("desktop avatar link to /profile is rendered (≥ md)", () => {
    render(<Harness />);
    // Two profile links exist: one in the mobile menu, one in the desktop chrome.
    // The desktop one uses aria-label='Open profile' on the avatar.
    expect(screen.getByRole("link", { name: "Open profile" })).toBeInTheDocument();
  });
});