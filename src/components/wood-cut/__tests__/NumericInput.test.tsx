import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NumericInput from "../NumericInput";

describe("NumericInput", () => {
  it("renders with initial value", () => {
    render(<NumericInput value={1200} onChange={vi.fn()} min={1} defaultValue={100} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("1200");
  });

  it("allows clearing input completely without snapping to 1", () => {
    const handleChange = vi.fn();
    render(<NumericInput value={500} onChange={handleChange} min={1} defaultValue={100} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    // Does not fire invalid 0 / 1 while user is clearing
    expect(handleChange).not.toHaveBeenCalledWith(0);
  });

  it("allows typing new multi-digit numbers smoothly", () => {
    function ControlledWrapper() {
      const [val, setVal] = useState(1);
      return <NumericInput value={val} onChange={setVal} min={1} defaultValue={100} />;
    }
    render(<ControlledWrapper />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    // Clear and type 2233
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "2233" } });
    expect(input.value).toBe("2233");
  });

  it("falls back to defaultValue on blur if left empty", () => {
    const handleChange = vi.fn();
    render(<NumericInput value={500} onChange={handleChange} min={1} defaultValue={100} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("100");
    expect(handleChange).toHaveBeenCalledWith(100);
  });
});
