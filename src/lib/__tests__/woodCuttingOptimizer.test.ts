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
    expect(result.joinedPieces.length).toBe(2);
    expect(result.summary.totalStockSheets).toBe(result.stockSheetsUsed.length);
  });

  it("automatically rotates pieces 90 degrees to fit stock sheet without error", () => {
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1200, width: 600 }
    ];
    // A piece 500x800 cannot fit normal (800 > 600) but fits rotated (800 <= 1200 and 500 <= 600)
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm ngang", length: 500, width: 800, quantity: 1, allowRotation: true }
    ];
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces[0].rotated).toBe(true);
  });

  it("filters out invalid zero or negative dimensions safely without throwing", () => {
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1200, width: 600 }
    ];
    const pieces: RequiredPieceInput[] = [
      { id: "p-invalid", name: "Tấm dở dang", length: 0, width: 0, quantity: 1, allowRotation: true },
      { id: "p-valid", name: "Tấm hợp lệ", length: 300, width: 300, quantity: 1, allowRotation: true },
    ];
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces[0].name).toBe("Tấm hợp lệ");
  });

  it("strictly respects allowRotation: false and keeps grain direction", () => {
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1000, width: 600 }
    ];
    // Piece 800x400: If allowRotation: false, length must be 800 and width 400 (not rotated)
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm vân dọc", length: 800, width: 400, quantity: 1, allowRotation: false }
    ];
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces[0].rotated).toBe(false);
    expect(result.stockSheetsUsed[0].placedPieces[0].length).toBe(800);
    expect(result.stockSheetsUsed[0].placedPieces[0].width).toBe(400);
  });
});

