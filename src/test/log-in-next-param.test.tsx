import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import LogInPage from "@/app/(auth)/log-in/page";
import { LogInForm } from "@/app/(auth)/log-in/LogInForm";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <LogInPage />
      </SettingsProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  pushMock.mockClear();
  mockSearchParams = new URLSearchParams();
});

describe("LogIn page — ?next= handling (issue #110)", () => {
  it("defaults to /dashboard when no ?next= is present", async () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "secret-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Log in/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("honors a safe internal ?next= param (e.g. /practice)", async () => {
    mockSearchParams = new URLSearchParams("next=/practice");
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "secret-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Log in/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/practice");
    });
  });

  it("blocks an absolute-URL ?next= (open-redirect → /dashboard)", async () => {
    mockSearchParams = new URLSearchParams("next=https://evil.example.com");
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "secret-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Log in/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(pushMock).not.toHaveBeenCalledWith("https://evil.example.com");
  });

  it("blocks a protocol-relative ?next= (//evil.example.com → /dashboard)", async () => {
    mockSearchParams = new URLSearchParams("next=//evil.example.com");
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "secret-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Log in/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("blocks a /javascript: scheme injected into the first segment", async () => {
    mockSearchParams = new URLSearchParams("next=/javascript:alert(1)");
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "secret-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Log in/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});

describe("LogIn page — Suspense boundary (follow-up to PR #114)", () => {
  it("page.tsx is a server component that wraps LogInForm in <Suspense>", async () => {
    // Read the page source to verify it imports Suspense + LogInForm and
    // does NOT use useSearchParams directly (which would require the
    // suspense boundary at a higher level).
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "src/app/(auth)/log-in/page.tsx"),
      "utf-8",
    );
    // Server-component contract: no "use client" directive
    expect(src).not.toMatch(/^"use client"/m);
    // Imports Suspense from react
    expect(src).toMatch(/import\s*\{[^}]*Suspense[^}]*\}\s*from\s*["']react["']/);
    // Imports LogInForm from the sibling file
    expect(src).toMatch(/import\s*\{[^}]*LogInForm[^}]*\}\s*from\s*["']\.\/LogInForm["']/);
    // Renders <Suspense fallback={...}><LogInForm /></Suspense>
    expect(src).toMatch(/<Suspense[^>]*fallback=\{[^}]+\}[^>]*>/);
    expect(src).toMatch(/<\/Suspense>/);
  });

  it("LogInForm retains the ?next= contract when rendered standalone", async () => {
    // The Suspense boundary split means tests can render LogInForm
    // directly to skip the boundary — but the contract still holds.
    mockSearchParams = new URLSearchParams("next=/review");
    render(
      <AuthProvider>
        <SettingsProvider>
          <LogInForm />
        </SettingsProvider>
      </AuthProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "secret-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Log in/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/review");
    });
  });
});