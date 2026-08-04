import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SettingsProvider } from "@/lib/settings";
import { PrivacyControls } from "@/components/settings/PrivacyControls";

function Harness() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PrivacyControls />
      </SettingsProvider>
    </AuthProvider>
  );
}

function seedUser() {
  window.localStorage.setItem(
    "portuguese-teacher:user",
    JSON.stringify({
      id: "demo-learner-001",
      name: "Demo",
      email: "demo@portugues.app",
      dialect: "pt-PT",
      level: "A0",
      streakDays: 1,
      weeklyMinutes: 0,
      createdAt: "2026-06-01T00:00:00.000Z",
    }),
  );
}

describe("PrivacyControls", () => {
  let clickSpy: { mock: { calls: unknown[] }; mockRestore: () => void };

  beforeEach(() => {
    window.localStorage.clear();
    seedUser();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:mock"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined) as unknown as typeof clickSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clickSpy.mockRestore();
  });

  it("renders the export and deletion cards", async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByText(/Take your data with you/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Delete your account and data/)).toBeInTheDocument();
  });

  it("downloads a JSON export when the button is clicked", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Download JSON export/ })).toBeInTheDocument();
    });

    let capturedBlob: Blob | null = null;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((input: unknown) => {
        capturedBlob = input as Blob;
        return "blob:mock";
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Download JSON export/ }));

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedBlob).not.toBeNull();
    const blob = capturedBlob as unknown as Blob;
    expect(blob.type).toBe("application/json");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("walks through the deletion request confirmation flow", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Request deletion/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Request deletion/ }));
    expect(screen.getByRole("button", { name: /Yes, request deletion/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Yes, request deletion/ }));
    await waitFor(() => {
      const stored = window.localStorage.getItem("portuguese-teacher:deletion:demo-learner-001");
      expect(stored).not.toBeNull();
    });
    const parsed = JSON.parse(
      window.localStorage.getItem("portuguese-teacher:deletion:demo-learner-001") ?? "{}",
    );
    expect(typeof parsed.requestedAt).toBe("string");
    expect(typeof parsed.completesBy).toBe("string");
  });

  it("cancels a pending deletion", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Request deletion/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Request deletion/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, request deletion/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Cancel deletion request/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Cancel deletion request/ }));
    await waitFor(() => {
      expect(window.localStorage.getItem("portuguese-teacher:deletion:demo-learner-001")).toBeNull();
    });
  });

  it("renders the SC-5 Sampling Buffer card with the toggle + status pill (issue #35)", async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByTestId("sc5-opt-out")).toBeInTheDocument();
    });
    const checkbox = screen.getByTestId("sc5-opt-out") as HTMLInputElement;
    const status = screen.getByTestId("sc5-status");
    expect(checkbox.checked).toBe(false);
    expect(status.getAttribute("data-state")).toBe("active");
    expect(status.textContent).toMatch(/Active/);
  });

  it("toggles sc5OptOut + updates the status pill", async () => {
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByTestId("sc5-opt-out")).toBeInTheDocument();
    });
    const checkbox = screen.getByTestId("sc5-opt-out") as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect((screen.getByTestId("sc5-opt-out") as HTMLInputElement).checked).toBe(true);
    });
    const status = screen.getByTestId("sc5-status");
    expect(status.getAttribute("data-state")).toBe("opted-out");
    expect(status.textContent).toMatch(/Opted out/);
  });
});
