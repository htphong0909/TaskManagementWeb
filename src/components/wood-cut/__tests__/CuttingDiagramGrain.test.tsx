import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CuttingDiagram from "../CuttingDiagram";
import JoinedPieceDiagramView from "../JoinedPieceDiagramView";
import { PlacedStockSheet, JoinedPieceDiagram } from "@/types/woodCut";

describe("CuttingDiagram & JoinedPieceDiagramView - Grain Visuals", () => {
  it("renders CuttingDiagram with stock grain badge and piece grain labels", () => {
    const sheet: PlacedStockSheet = {
      sheetIndex: 1,
      stockType: { id: "s1", length: 1200, width: 600 },
      length: 1200,
      width: 600,
      placedPieces: [
        {
          id: "p1",
          name: "Cánh Tủ",
          x: 0,
          y: 0,
          length: 500,
          width: 300,
          rotated: false,
          color: "#c4b5fd",
          appliedGrain: "vertical",
        },
        {
          id: "p2",
          name: "Đợt Ngang",
          x: 500,
          y: 0,
          length: 300,
          width: 200,
          rotated: true,
          color: "#fed7aa",
          appliedGrain: "horizontal",
        },
      ],
      usedArea: 210000,
      wasteArea: 510000,
      efficiency: 29.2,
      cutsCount: 4,
    };

    render(<CuttingDiagram sheet={sheet} stockGrain="vertical" />);

    expect(screen.getByText(/Tấm ván gốc #1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/↕️ Vân dọc/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Cánh Tủ/i)).toBeInTheDocument();
    expect(screen.getByText(/Đợt Ngang/i)).toBeInTheDocument();
    expect(screen.getByText(/500 × 300 mm • ↕️ Vân dọc/i)).toBeInTheDocument();
    expect(screen.getByText(/300 × 200 mm • ↔️ Vân ngang \(Xoay 90°\)/i)).toBeInTheDocument();
  });

  it("renders JoinedPieceDiagramView with grain badge and continuous grain", () => {
    const diagram: JoinedPieceDiagram = {
      parentId: "joined-1",
      parentName: "Mặt Bàn Lớn",
      targetLength: 1200,
      targetWidth: 800,
      seamCount: 1,
      grain: "vertical",
      subPieces: [
        {
          id: "sub-1",
          parentId: "joined-1",
          parentName: "Mặt Bàn Lớn",
          relX: 0,
          relY: 0,
          length: 600,
          width: 800,
          appliedGrain: "vertical",
        },
        {
          id: "sub-2",
          parentId: "joined-1",
          parentName: "Mặt Bàn Lớn",
          relX: 600,
          relY: 0,
          length: 600,
          width: 800,
          appliedGrain: "vertical",
        },
      ],
    };

    render(<JoinedPieceDiagramView diagram={diagram} />);

    expect(screen.getByText(/Mặt Bàn Lớn/i)).toBeInTheDocument();
    expect(screen.getByText(/↕️ Vân dọc/i)).toBeInTheDocument();
    expect(screen.getByText(/Ghép 2 mẩu/i)).toBeInTheDocument();
  });
});
