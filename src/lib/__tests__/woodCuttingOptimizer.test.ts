import { describe, it, expect } from "vitest";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("woodCuttingOptimizer", () => {
  const stockSheets: StockSheetInput[] = [
    { id: "s1", name: "Ván 1200x600", length: 1200, width: 600 }
  ];

  it("calculates simple piece packing accurately", () => {
    const requiredPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm vuông 234", length: 234, width: 234, quantity: 4, allowRotation: true }
    ];

    const result = calculateWoodCut(stockSheets, requiredPieces, { kerf: 3 });
    expect(result.stockSheetsUsed.length).toBe(1);
    expect(result.stockSheetsUsed[0].placedPieces.length).toBe(4);
    expect(result.summary.totalStockSheets).toBe(1);
    expect(result.summary.efficiencyPercent).toBeGreaterThan(0);
  });

  it("handles user example (1110x1230 and 234x234 on 1200x600 stock)", () => {
    const requiredPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Mặt lớn 1110x1230", length: 1110, width: 1230, quantity: 1, allowRotation: true },
      { id: "p2", name: "Mặt nhỏ 234x234", length: 234, width: 234, quantity: 1, allowRotation: true },
    ];

    const result = calculateWoodCut(stockSheets, requiredPieces, { kerf: 3 });
    expect(result.stockSheetsUsed.length).toBeGreaterThanOrEqual(3);
    expect(result.joinedPieces.length).toBe(1);
    expect(result.summary.totalStockSheets).toBe(result.stockSheetsUsed.length);
  });

  it("respects allowRotation = false for grain direction", () => {
    const rigidStock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 500 }];
    const rigidPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm dọc", length: 400, width: 800, quantity: 1, allowRotation: false }
    ];

    const result = calculateWoodCut(rigidStock, rigidPieces, { kerf: 0 });
    expect(result.stockSheetsUsed.length).toBeGreaterThan(0);
  });
});
