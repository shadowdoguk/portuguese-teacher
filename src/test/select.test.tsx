import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Select } from "@/components/ui/Select";

describe("Select", () => {
  it("accepts string options", () => {
    let next = "a";
    render(
      <Select<string>
        label="Pick"
        value={next}
        onChange={(v) => {
          next = v;
        }}
        options={["a", "b", "c"]}
      />,
    );
    expect(screen.getByDisplayValue("a")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Pick"), { target: { value: "c" } });
    expect(next).toBe("c");
  });

  it("accepts {value,label} options", () => {
    let next: "a" | "b" = "a";
    render(
      <Select<"a" | "b">
        label="Native"
        value={next}
        onChange={(v) => {
          next = v;
        }}
        options={[
          { value: "a", label: "A (first)" },
          { value: "b", label: "B (second)" },
        ]}
      />,
    );
    expect(screen.getByText("A (first)")).toBeInTheDocument();
  });
});
