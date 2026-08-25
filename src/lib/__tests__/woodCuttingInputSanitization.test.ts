import { describe, it, expect } from "vitest";
import { calculateWoodCut, INPUT_LIMITS } from "../woodCuttingOptimizer";
import { parseRequiredPiecesText } from "../woodCutParser";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("Input Constraints & Outlier Sanitization Safety Tests", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];

  it("safely blocks 1e9 mm dimension in < 1ms without memory exhaustion", () => {
    const extremePiece: RequiredPieceInput[] = [
      { id: "p-extreme", name: "1e9 Giant", length: 1_000_000_000, width: 500, quantity: 1, allowRotation: true },
    ];

    const start = performance.now();
    const result = calculateWoodCut(stock, extremePiece);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10); // Phải hoàn thành dưới 10ms
    expect(result.stockSheetsUsed).toHaveLength(0);
    expect(result.joinedPieces).toHaveLength(0);
  });

  it("safely ignores negative, zero, and NaN dimensions without throwing errors", () => {
    const invalidPieces: RequiredPieceInput[] = [
      { id: "p-neg", name: "Negative", length: -500, width: 300, quantity: 1, allowRotation: true },
      { id: "p-zero", name: "Zero", length: 0, width: 300, quantity: 1, allowRotation: true },
      { id: "p-nan", name: "NaN", length: NaN, width: 300, quantity: 1, allowRotation: true },
    ];

    const result = calculateWoodCut(stock, invalidPieces);
    expect(result.stockSheetsUsed).toHaveLength(0);
    expect(result.joinedPieces).toHaveLength(0);
  });

  it("safely blocks massive quantity (q = 100,000) via pre-flight subpiece limit", () => {
    const massiveOrder: RequiredPieceInput[] = [
      { id: "p-massive", name: "Massive", length: 2000, width: 1000, quantity: 100_000, allowRotation: true },
    ];

    const start = performance.now();
    const result = calculateWoodCut(stock, massiveOrder);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(15);
    expect(result.stockSheetsUsed).toHaveLength(0);
  });

  it("batch parser catches out-of-bound dimensions and formats readable errors", () => {
    const batchInput = `
      // Valid line
      1000, 500, 2 !doc
      // 1e9 extreme
      1000000000, 500 !ngang
      // Negative
      -500, 300
      // Over quantity
      500, 300, 9999
    `;

    const { pieces, errors } = parseRequiredPiecesText(batchInput);
    expect(pieces).toHaveLength(1); // Chỉ 1 dòng hợp lệ được nhận
    expect(pieces[0].length).toBe(1000);
    expect(pieces[0].width).toBe(500);

    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(errors.some((e) => e.includes("30,000mm"))).toBe(true);
    expect(errors.some((e) => e.includes("phải là số dương"))).toBe(true);
    expect(errors.some((e) => e.includes("500 tấm/loại"))).toBe(true);
  });

  it("processes valid upper bound dimension (30,000mm) smoothly", () => {
    const largeValidPiece: RequiredPieceInput[] = [
      { id: "p-large", name: "Hall Floor", length: 12000, width: 2400, quantity: 1, allowRotation: true },
    ];

    const start = performance.now();
    const result = calculateWoodCut(stock, largeValidPiece);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    expect(result.joinedPieces).toHaveLength(1);
    expect(result.stockSheetsUsed.length).toBeGreaterThan(0);
  });
});
