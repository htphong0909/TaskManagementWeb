import { describe, it, expect } from "vitest";
import { solveGroundTruthDP } from "../dpGroundTruthOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("DP Bitmask Ground Truth Solver", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 1000 }];

  it("finds exact 1-sheet solution for 4 quadrant squares using bitmask DP", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Q1", length: 495, width: 495, quantity: 4, allowRotation: true },
    ];
    const result = solveGroundTruthDP(stock, pieces, { kerf: 10 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(4);
  });

  it("proves 2 sheets minimum for pieces exceeding 1 sheet capacity", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Big1", length: 800, width: 600, quantity: 1, allowRotation: true },
      { id: "p2", name: "Big2", length: 800, width: 600, quantity: 1, allowRotation: true },
    ];
    const result = solveGroundTruthDP(stock, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(2);
  });

  it("respects allowRotation: false in bitmask feasibility search", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "R1", length: 900, width: 300, quantity: 1, allowRotation: false },
      { id: "p2", name: "R2", length: 900, width: 300, quantity: 1, allowRotation: false },
      { id: "p3", name: "R3", length: 900, width: 300, quantity: 1, allowRotation: false },
    ];
    const result = solveGroundTruthDP(stock, pieces, { kerf: 0 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces.every((p) => !p.rotated)).toBe(true);
  });

  it("gracefully falls back to heuristic when N > 12 without hanging or crashing", () => {
    const stockSheet: StockSheetInput[] = [{ id: "s1", length: 2000, width: 1000 }];
    const pieces: RequiredPieceInput[] = Array.from({ length: 16 }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Tấm ${i + 1}`,
      length: 300,
      width: 200,
      quantity: 1,
      allowRotation: true,
    }));

    const t0 = performance.now();
    const res = solveGroundTruthDP(stockSheet, pieces, { kerf: 3 });
    const t1 = performance.now();

    expect(res.stockSheetsUsed.length).toBeGreaterThan(0);
    expect(t1 - t0).toBeLessThan(1000);
  });
});
