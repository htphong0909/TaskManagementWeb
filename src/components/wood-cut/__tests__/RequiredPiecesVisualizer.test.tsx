import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RequiredPiecesVisualizer from "../RequiredPiecesVisualizer";

describe("RequiredPiecesVisualizer", () => {
  it("renders miniature pieces with names and grain direction", () => {
    const pieces = [
      { id: "p1", name: "Mặt bàn", length: 800, width: 400, quantity: 1, grain: "horizontal" as const },
    ];
    render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="horizontal" />);
    expect(screen.getByText("Mặt bàn")).toBeDefined();
    expect(screen.getByText(/800 × 400 mm/)).toBeDefined();
    expect(screen.getAllByText(/Vân ngang/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows disabled/no-grain status when stockGrain is none", () => {
    const pieces = [
      { id: "p1", name: "Tấm trơn", length: 500, width: 300, quantity: 2, grain: "vertical" as const },
    ];
    render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="none" />);
    expect(screen.getAllByText(/Không vân/).length).toBeGreaterThanOrEqual(1);
  });
});
