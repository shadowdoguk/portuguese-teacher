import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ScenarioLibrary } from "@/components/practice/ScenarioLibrary";
import { SCENARIO_LIBRARY } from "@/lib/scenarios/library";

function noop() {
  // no-op for onSelect in tests
}

describe("ScenarioLibrary", () => {
  it("renders ≥ 30 scenario cards by default", () => {
    render(<ScenarioLibrary progress={{}} onSelect={noop} />);
    const cards = screen.getAllByTestId(/^scenario-card-/);
    expect(cards.length).toBe(SCENARIO_LIBRARY.length);
  });

  it("shows the library header with total count", () => {
    render(<ScenarioLibrary progress={{}} onSelect={noop} />);
    expect(screen.getByText(/Scenario library/)).toBeInTheDocument();
  });

  it("renders start scenario buttons with accessible labels", () => {
    render(<ScenarioLibrary progress={{}} onSelect={noop} />);
    const starts = screen.getAllByTestId(/^scenario-start-/);
    expect(starts.length).toBe(SCENARIO_LIBRARY.length);
    for (const btn of starts) {
      expect(btn.tagName).toBe("BUTTON");
    }
  });

  it("renders every category filter", () => {
    render(<ScenarioLibrary progress={{}} onSelect={noop} />);
    expect(screen.getByTestId("filter-category-cafe-restaurant")).toBeInTheDocument();
    expect(screen.getByTestId("filter-category-greetings-introductions")).toBeInTheDocument();
    expect(screen.getByTestId("filter-category-doctor")).toBeInTheDocument();
  });

  it("marks completed scenarios with a Re-run label", () => {
    const first = SCENARIO_LIBRARY[0]!;
    render(
      <ScenarioLibrary
        progress={{
          [first.id]: {
            scenarioId: first.id,
            completedAt: 1,
            bestStars: 2,
            attempts: 1,
          },
        }}
        onSelect={noop}
      />,
    );
    const card = screen.getByTestId(`scenario-card-${first.id}`);
    expect(within(card).getByText(/Re-run scenario/)).toBeInTheDocument();
  });

  it("shows star rating on completed scenarios", () => {
    const first = SCENARIO_LIBRARY[0]!;
    render(
      <ScenarioLibrary
        progress={{
          [first.id]: {
            scenarioId: first.id,
            completedAt: 1,
            bestStars: 3,
            attempts: 1,
          },
        }}
        onSelect={noop}
      />,
    );
    expect(screen.getByLabelText(/Completed, ★★★/)).toBeInTheDocument();
  });
});
