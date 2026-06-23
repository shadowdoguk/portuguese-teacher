import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";
import { DialectChip } from "@/components/ui/DialectChip";
import { formatStage, pluralize } from "@/lib/utils";

describe("Card", () => {
  it("renders eyebrow and title", () => {
    render(
      <Card eyebrow="Method" title="Spaced repetition">
        Half-life scheduler.
      </Card>,
    );
    expect(screen.getByText("Method")).toBeInTheDocument();
    expect(screen.getByText("Spaced repetition")).toBeInTheDocument();
    expect(screen.getByText(/Half-life scheduler/)).toBeInTheDocument();
  });
});

describe("DialectChip", () => {
  it("renders the European dialect label", () => {
    render(<DialectChip variant="pt-PT" />);
    expect(screen.getByText(/European · pt-PT/)).toBeInTheDocument();
  });
});

describe("utils", () => {
  it("pluralizes correctly", () => {
    expect(pluralize(0, "item")).toBe("0 items");
    expect(pluralize(1, "item")).toBe("1 item");
    expect(pluralize(2, "item")).toBe("2 items");
  });

  it("uppercases stage codes", () => {
    expect(formatStage("a1")).toBe("A1");
    expect(formatStage("b1")).toBe("B1");
  });
});