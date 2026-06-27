import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Toggle } from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("renders label and reflects checked state", () => {
    render(
      <Toggle checked={true} onChange={() => undefined} label="Voice recordings" />,
    );
    const button = screen.getByRole("switch", { name: "Voice recordings" });
    expect(button.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Voice recordings")).toBeInTheDocument();
  });

  it("fires onChange with flipped value", () => {
    let next = false;
    render(
      <Toggle
        checked={false}
        onChange={(value) => {
          next = value;
        }}
        label="Captions"
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Captions" }));
    expect(next).toBe(true);
  });

  it("renders description when supplied", () => {
    render(
      <Toggle
        checked={false}
        onChange={() => undefined}
        label="Voice"
        description="Encrypted at rest, deletable from Settings."
      />,
    );
    expect(screen.getByText(/Encrypted at rest/)).toBeInTheDocument();
  });

  it("respects disabled state", () => {
    render(
      <Toggle
        checked={false}
        onChange={() => undefined}
        label="Disabled"
        disabled
      />,
    );
    const button = screen.getByRole("switch", { name: "Disabled" });
    expect(button).toBeDisabled();
  });
});
