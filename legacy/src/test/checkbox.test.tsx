import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  it("renders label and description", () => {
    render(
      <Checkbox
        checked={false}
        onChange={() => undefined}
        label="Travel"
        description="Ordering food, asking for directions."
      />,
    );
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText(/Ordering food/)).toBeInTheDocument();
  });

  it("fires onChange with flipped value", () => {
    let next = false;
    render(
      <Checkbox
        checked={false}
        onChange={(value) => {
          next = value;
        }}
        label="Heritage"
      />,
    );
    fireEvent.click(screen.getByLabelText("Heritage"));
    expect(next).toBe(true);
  });
});
