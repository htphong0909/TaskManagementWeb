import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import RequiredPiecesVisualizer from "../RequiredPiecesVisualizer";
import { RequiredPieceInput } from "@/types/woodCut";

describe("RequiredPiecesVisualizer", () => {
  it("renders miniature pieces with names and grain direction", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Mặt bàn", length: 800, width: 400, quantity: 1, grain: "horizontal" },
    ];
    render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="horizontal" />);
    expect(screen.getByText("Mặt bàn")).toBeInTheDocument();
    expect(screen.getByText(/800 × 400 mm/)).toBeInTheDocument();
    expect(screen.getAllByText(/Vân ngang/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Xem lớn/i)).toBeInTheDocument();
  });

  it("shows disabled/no-grain status when stockGrain is none", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm trơn", length: 500, width: 300, quantity: 2, grain: "vertical" },
    ];
    render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="none" />);
    expect(screen.getAllByText(/Không vân/).length).toBeGreaterThanOrEqual(1);
  });

  it("opens DiagramZoomModal on piece card click with dimension lines, single and total area", () => {
    const pieces: RequiredPieceInput[] = [
      {
        id: "p1",
        name: "Cánh Tủ Áo",
        length: 800,
        width: 400,
        quantity: 2,
        grain: "vertical",
        orientation: "vertical",
        allowRotation: false,
      },
    ];
    render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="vertical" />);

    // Click card to open modal
    fireEvent.click(screen.getByText("Cánh Tủ Áo"));

    // Modal elements
    expect(screen.getByText(/Chi Tiết: Cánh Tủ Áo/i)).toBeInTheDocument();
    expect(screen.getByText(/Dài: 800 mm/i)).toBeInTheDocument();
    expect(screen.getByText(/Rộng: 400 mm/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0.320 m²/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/0.640 m²/i).length).toBeGreaterThanOrEqual(1);

    // Close modal via Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/Chi Tiết: Cánh Tủ Áo/i)).not.toBeInTheDocument();
  });
});
