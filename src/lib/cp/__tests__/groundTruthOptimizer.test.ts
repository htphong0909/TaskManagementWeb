import { describe, it, expect } from "vitest";
import { solveGroundTruth } from "../groundTruthOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("Ground Truth Exact Guillotine Solver", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 1000 }];

  it("finds 100% optimal 1-sheet placement for 4 quadrant squares", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Q1", length: 495, width: 495, quantity: 4, allowRotation: true },
    ];
    const result = solveGroundTruth(stock, pieces, { kerf: 10 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(4);
    expect(result.summary.totalStockSheets).toBe(1);
  });

  it("respects allowRotation: false during exhaustive search", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "R1", length: 800, width: 300, quantity: 1, allowRotation: false },
      { id: "p2", name: "R2", length: 800, width: 300, quantity: 1, allowRotation: false },
      { id: "p3", name: "R3", length: 800, width: 300, quantity: 1, allowRotation: false },
    ];
    const result = solveGroundTruth(stock, pieces, { kerf: 0 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces.every((p) => !p.rotated)).toBe(true);
  });

  it("proves 2 sheets required when pieces exceed 1 sheet area", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Big1", length: 900, width: 600, quantity: 1, allowRotation: true },
      { id: "p2", name: "Big2", length: 900, width: 600, quantity: 1, allowRotation: true },
    ];
    const result = solveGroundTruth(stock, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(2);
  });
});
