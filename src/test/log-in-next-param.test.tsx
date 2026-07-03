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