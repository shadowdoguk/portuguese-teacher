import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import SignUpPage from "@/app/(auth)/sign-up/page";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SignUpPage />
      </SettingsProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  pushMock.mockClear();
});

describe("SignUp page", () => {
  it("captures self-assessment and routes A0 learners to the dashboard", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create account/ })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Test Learner" } });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "secret-1" },
    });

    // Default self-assessment is A0
    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });

    const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
    expect(stored.selfAssessmentLevel).toBe("A0");
    expect(stored.name).toBe("Test Learner");
  });

  it("routes above-A0 learners to the placement page", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create account/ })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Test Learner" } });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "secret-1" },
    });

    fireEvent.change(screen.getByLabelText(/Current Portuguese level/), {
      target: { value: "A2" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/placement");
    });

    const stored = JSON.parse(window.localStorage.getItem("portuguese-teacher:user") ?? "{}");
    expect(stored.selfAssessmentLevel).toBe("A2");
  });
});