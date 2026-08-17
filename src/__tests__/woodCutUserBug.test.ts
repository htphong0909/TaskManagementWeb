import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText } from "@/lib/woodCutParser";
import { calculateWoodCut } from "@/lib/woodCuttingOptimizer";
import { StockSheetInput } from "@/types/woodCut";

describe("User Bug Reproduction: Oversized piece overflow and >100% efficiency", () => {
  it("never exceeds 100% efficiency on any stock sheet and fits within boundaries", () => {
    const rawInput = `
      1928, 1120
      331, 4441, 3
      119, 1123
    `;
    const { pieces, errors } = parseRequiredPiecesText(rawInput);
    expect(errors).toHaveLength(0);

    const stockSheets: StockSheetInput[] = [
      { id: "s1", name: "Ván 1200x600", length: 1200, width: 600 }
    ];

    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });

    // 1. Mỗi tấm ván gốc có hiệu suất <= 100%
    result.stockSheetsUsed.forEach((sheet) => {
      expect(sheet.efficiency).toBeLessThanOrEqual(100);
      expect(sheet.usedArea).toBeLessThanOrEqual((sheet.length * sheet.width) / 1_000_000 + 0.001);

      // 2. Mọi chi tiết đặt trên tấm ván gốc phải nằm trọn vẹn trong kích thước (length x width)
      sheet.placedPieces.forEach((p) => {
        expect(p.x + p.length).toBeLessThanOrEqual(sheet.length);
        expect(p.y + p.width).toBeLessThanOrEqual(sheet.width);
      });
    });
  });
});
