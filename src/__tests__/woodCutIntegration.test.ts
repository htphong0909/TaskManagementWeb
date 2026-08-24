import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText } from "@/lib/woodCutParser";
import { calculateWoodCut } from "@/lib/woodCuttingOptimizer";
import { solveGroundTruthDP } from "@/lib/cp/dpGroundTruthOptimizer";
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

  it("handles the user image test case with orientations using both Heuristic and Exact DP", () => {
    const rawInput = `
      1600, 2700
      410, 2700 !doc
      1250, 800 !ngang
      60, 1700
      400, 1830, 2 !doc
      400, 1250
    `;
    const { pieces, errors } = parseRequiredPiecesText(rawInput);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(6);

    const stockSheets: StockSheetInput[] = [
      { id: "s1", name: "Ván 2440x1220", length: 2440, width: 1220 }
    ];

    // 1. Heuristic
    const heurResult = calculateWoodCut(stockSheets, pieces, { kerf: 3 });
    expect(heurResult.stockSheetsUsed.length).toBeGreaterThan(0);
    expect(heurResult.summary.totalStockSheets).toBe(4);

    // 2. Exact DP
    const dpResult = solveGroundTruthDP(stockSheets, pieces, { kerf: 3 });
    expect(dpResult.stockSheetsUsed.length).toBeGreaterThan(0);
    expect(dpResult.summary.totalStockSheets).toBe(4);

    // Both match optimal sheets
    expect(heurResult.summary.totalStockSheets).toBe(dpResult.summary.totalStockSheets);
  });
});
