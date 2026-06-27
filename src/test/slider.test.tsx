import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Slider } from "@/components/ui/Slider";

describe("Slider", () => {
  it("renders label and value", () => {
    render(
      <Slider
        label="Voice speed"
        value={1.0}
        min={0.75}
        max={1.25}
        onChange={() => undefined}
        formatValue={(v) => `${v.toFixed(2)}×`}
      />,
    );
    expect(screen.getByText("1.00×")).toBeInTheDocument();
  });

  it("calls onChange when value changes", () => {
    let next = 1.0;
    render(
      <Slider
        label="Voice speed"
        value={1.0}
        min={0.75}
        max={1.25}
        onChange={(value) => {
          next = value;
        }}
      />,
    );
    const slider = screen.getByLabelText("Voice speed") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "1.15" } });
    expect(next).toBe(1.15);
  });
});
