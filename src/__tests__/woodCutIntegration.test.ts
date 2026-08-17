import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText } from "@/lib/woodCutParser";
import { calculateWoodCut } from "@/lib/woodCuttingOptimizer";
import { StockSheetInput } from "@/types/woodCut";

describe("Wood Cut System Integration", () => {
  it("executes full workflow from raw user input to final cutting diagrams", () => {
    // 1. Raw user input
    const rawInput = `
      1110, 1230
      234,   234
    `;
    const { pieces, errors } = parseRequiredPiecesText(rawInput);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(2);

    // 2. Stock sheets
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1200, width: 600 }
    ];

    // 3. Optimize
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });

    // 4. Assertions
    expect(result.stockSheetsUsed.length).toBeGreaterThanOrEqual(3);
    expect(result.joinedPieces.length).toBe(2); // Cả 2 mặt gỗ đều có sơ đồ cấu trúc
    expect(result.joinedPieces[0].seamCount).toBeGreaterThan(0); // 1110x1230 cần ghép
    expect(result.joinedPieces[1].seamCount).toBe(0); // 234x234 là tấm nguyên
    expect(result.joinedPieces[0].subPieces[0].stockSheetIndex).toBeDefined();
    expect(result.summary.totalStockSheets).toBe(result.stockSheetsUsed.length);
    expect(result.summary.efficiencyPercent).toBeGreaterThan(45);
  });
});
