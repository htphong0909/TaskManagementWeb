import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import StockSheetVisualizer from "../StockSheetVisualizer";

describe("StockSheetVisualizer", () => {
  it("renders preview cards with correct dimensions and grain labels", () => {
    const sheets = [{ id: "s1", name: "Ván 1", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="horizontal" />);
    expect(screen.getByText("Ván 1")).toBeInTheDocument();
    expect(screen.getByText(/1200 × 600 mm/)).toBeInTheDocument();
    expect(screen.getAllByText(/Vân ngang/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Xem lớn/i)).toBeInTheDocument();
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

  it("opens DiagramZoomModal on card click with dimensions, area, and closes cleanly", () => {
    const sheets = [{ id: "s1", name: "Ván Chuẩn 1", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="vertical" />);

    // Click card to open modal
    fireEvent.click(screen.getByText("Ván Chuẩn 1"));

    // Modal elements
    expect(screen.getByText(/Ván Phôi: Ván Chuẩn 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0.720 m²/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Dài: 1200 mm/i)).toBeInTheDocument();
    expect(screen.getByText(/Rộng: 600 mm/i)).toBeInTheDocument();

    // Close modal via Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/Ván Phôi: Ván Chuẩn 1/i)).not.toBeInTheDocument();
  });
});
