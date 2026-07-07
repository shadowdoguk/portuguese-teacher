import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useAuth } from "@/lib/auth/useAuth";
import { useLearnerId } from "@/lib/auth/useLearnerId";
import { clearLearner, seedLearner, withAuth } from "./auth-helpers";

function Probe() {
  const id = useLearnerId();
  const { state } = useAuth();
  return (
    <>
      <span data-testid="learner-id">{id ?? ""}</span>
      <span data-testid="auth-state">{state.status}</span>
    </>
  );
}

beforeEach(() => {
  clearLearner();
});

afterEach(() => {
  cleanup();
});

describe("useLearnerId (issue #105)", () => {
  it("returns null when no Learner is signed in (anonymous state)", async () => {
    render(withAuth(<Probe />));
    await screen.findByText("anonymous");
    expect(screen.getByTestId("learner-id").textContent).toBe("");
  });

  it("returns the authenticated Learner's id when signed in", async () => {
    seedLearner({ id: "learner-abc-123" });
    render(withAuth(<Probe />));
    await screen.findByText("learner-abc-123");
    expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
    expect(screen.getByTestId("learner-id").textContent).toBe("learner-abc-123");
  });
});
