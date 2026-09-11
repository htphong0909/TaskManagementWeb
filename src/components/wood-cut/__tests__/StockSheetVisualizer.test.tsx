import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StockSheetVisualizer from "../StockSheetVisualizer";

describe("StockSheetVisualizer", () => {
  it("renders preview cards with correct dimensions and grain labels", () => {
    const sheets = [{ id: "s1", name: "Ván 1", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="horizontal" />);
    expect(screen.getByText("Ván 1")).toBeDefined();
    expect(screen.getByText(/1200 × 600 mm/)).toBeDefined();
    expect(screen.getAllByText(/Vân ngang/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders correct badge when grain is none", () => {
    const sheets = [{ id: "s1", name: "Ván trơn", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="none" />);
    expect(screen.getAllByText(/Không vân/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders correct badge when grain is vertical", () => {
    const sheets = [{ id: "s1", name: "Ván dọc", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="vertical" />);
    expect(screen.getAllByText(/Vân dọc/).length).toBeGreaterThanOrEqual(1);
  });
});
