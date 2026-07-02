import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { isDemoMode } from "@/lib/auth/demoMode";
import { DemoModeBanner } from "@/components/auth/DemoModeBanner";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_MOCK;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isDemoMode (issue #113)", () => {
  it("returns false when NEXT_PUBLIC_MOCK is unset", () => {
    expect(isDemoMode()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_MOCK is an empty string", () => {
    process.env.NEXT_PUBLIC_MOCK = "";
    expect(isDemoMode()).toBe(false);
  });

  it("returns true when NEXT_PUBLIC_MOCK='1'", () => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    expect(isDemoMode()).toBe(true);
  });

  it("returns true when NEXT_PUBLIC_MOCK='true' (any case)", () => {
    process.env.NEXT_PUBLIC_MOCK = "TRUE";
    expect(isDemoMode()).toBe(true);
    process.env.NEXT_PUBLIC_MOCK = "Yes";
    expect(isDemoMode()).toBe(true);
  });

  it("returns false for non-truthy strings", () => {
    process.env.NEXT_PUBLIC_MOCK = "0";
    expect(isDemoMode()).toBe(false);
    process.env.NEXT_PUBLIC_MOCK = "false";
    expect(isDemoMode()).toBe(false);
  });
});

describe("DemoModeBanner (issue #113)", () => {
  it("renders nothing when NEXT_PUBLIC_MOCK is unset", () => {
    const { container } = render(<DemoModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a role='status' banner with the expected copy when NEXT_PUBLIC_MOCK=1", () => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    render(<DemoModeBanner />);
    const banner = screen.getByTestId("demo-mode-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("role", "status");
    expect(banner.textContent).toMatch(/Demo mode/);
    expect(banner.textContent).toMatch(/Credentials are not validated/);
  });
});