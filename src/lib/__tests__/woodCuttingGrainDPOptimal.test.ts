import { describe, it, expect } from "vitest";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { solveGroundTruthDP } from "../cp/dpGroundTruthOptimizer";
import { StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";
import { validateCuttingPlanIntegrity } from "../woodCuttingValidator";

describe("Grain Orientation Standardization & Dual DP Co-Testing", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];
  const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50 };

  it("strictly preserves original target dimensions and rotates cut correctly when switching vertical vs horizontal", () => {
    // 1. Chế độ Để dọc (Vertical)
    const vertPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Mặt Gỗ", length: 1000, width: 400, quantity: 1, orientation: "vertical", allowRotation: false },
    ];
    const vertResult = calculateWoodCut(stock, vertPieces, config);
    expect(vertResult.joinedPieces[0].targetLength).toBe(1000);
    expect(vertResult.joinedPieces[0].targetWidth).toBe(400);
    expect(vertResult.stockSheetsUsed[0].placedPieces[0].length).toBe(1000);
    expect(vertResult.stockSheetsUsed[0].placedPieces[0].width).toBe(400);
    expect(vertResult.stockSheetsUsed[0].placedPieces[0].rotated).toBe(false);

    // 2. Chế độ Để ngang (Horizontal)
    const horizPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Mặt Gỗ", length: 1000, width: 400, quantity: 1, orientation: "horizontal", allowRotation: false },
    ];
    const horizResult = calculateWoodCut(stock, horizPieces, config);
    // Sơ đồ mặt gỗ THÀNH PHẨM luôn giữ nguyên 1000 x 400
    expect(horizResult.joinedPieces[0].targetLength).toBe(1000);
    expect(horizResult.joinedPieces[0].targetWidth).toBe(400);
    // Trên sơ đồ cắt ván gốc, chi tiết bị xoay 90 độ ngang vân: chiều dài đặt là 400, chiều rộng đặt là 1000
    expect(horizResult.stockSheetsUsed[0].placedPieces[0].length).toBe(400);
    expect(horizResult.stockSheetsUsed[0].placedPieces[0].width).toBe(1000);
    expect(horizResult.stockSheetsUsed[0].placedPieces[0].rotated).toBe(true);
  });

  it("dual co-tests 50 small cases (N <= 8) with mixed grain orientations against DP Ground Truth", () => {
    let seed = 7777;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    let optimalMatches = 0;
    const testCount = 50;

    for (let t = 0; t < testCount; t++) {
      const pieceCount = Math.floor(rand() * 4) + 3; // 3 to 6 pieces
      const testPieces: RequiredPieceInput[] = [];

      for (let p = 0; p < pieceCount; p++) {
        const length = Math.floor(rand() * 1200) + 200;
        const width = Math.floor(rand() * 600) + 150;
        const r = rand();
        const orientation = r > 0.6 ? "auto" : r > 0.3 ? "vertical" : "horizontal";

        testPieces.push({
          id: `p-${t}-${p}`,
          name: `Piece-${p + 1}`,
          length,
          width,
          quantity: 1,
          orientation,
          allowRotation: orientation === "auto",
        });
      }

      // Chạy song song cả Heuristic và DP Ground Truth
      const heurResult = calculateWoodCut(stock, testPieces, config);
      const dpResult = solveGroundTruthDP(stock, testPieces, config);

      // Kiểm định bất biến hình học trên cả 2 phương án
      const heurVal = validateCuttingPlanIntegrity(heurResult, stock, testPieces, config);
      const dpVal = validateCuttingPlanIntegrity(dpResult, stock, testPieces, config);

      expect(heurVal.isValid).toBe(true);
      expect(heurVal.orientationViolationsCount).toBe(0);
      expect(dpVal.isValid).toBe(true);
      expect(dpVal.orientationViolationsCount).toBe(0);

      // Kiểm tra bất biến khóa vân gỗ cụ thể trên từng chi tiết của Heuristic
      for (const sheet of heurResult.stockSheetsUsed) {
        for (const placed of sheet.placedPieces) {
          const orig = testPieces.find((p) => p.name === placed.name);
          if (orig) {
            if (orig.orientation === "vertical") {
              expect(placed.rotated).toBe(false);
            }
            if (orig.orientation === "horizontal") {
              expect(placed.rotated).toBe(true);
            }
          }
        }
      }

      if (heurResult.stockSheetsUsed.length <= dpResult.stockSheetsUsed.length) {
        optimalMatches++;
      }
    }

    const matchRate = (optimalMatches / testCount) * 100;
    expect(matchRate).toBeGreaterThanOrEqual(96);
  });
});
