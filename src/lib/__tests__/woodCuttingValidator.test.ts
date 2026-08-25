import { describe, it, expect } from "vitest";
import { validateCuttingPlanIntegrity } from "../woodCuttingValidator";
import { CalculationResult, StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";

describe("woodCuttingValidator (Mathematical Invariant Verification)", () => {
  const stockSheets: StockSheetInput[] = [{ id: "s1", length: 1200, width: 600 }];
  const pieces: RequiredPieceInput[] = [
    { id: "p1", name: "Tấm 1", length: 400, width: 300, quantity: 2, allowRotation: true },
  ];
  const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50 };

  it("passes validation for a perfectly valid cutting result", () => {
    const validResult: CalculationResult = {
      stockSheetsUsed: [
        {
          sheetIndex: 1,
          stockType: stockSheets[0],
          length: 1200,
          width: 600,
          usedArea: 0.24,
          wasteArea: 0.48,
          efficiency: 33.3,
          cutsCount: 4,
          placedPieces: [
            { id: "p1-1", name: "Tấm 1", x: 0, y: 0, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
            { id: "p1-2", name: "Tấm 1", x: 403, y: 0, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
          ],
        },
      ],
      joinedPieces: [],
      summary: {
        totalStockSheets: 1,
        sheetBreakdown: { "1200x600": 1 },
        totalRequiredArea: 0.24,
        totalStockArea: 0.72,
        totalUsedArea: 0.24,
        totalWasteArea: 0.48,
        efficiencyPercent: 33.3,
        totalCutsCount: 4,
        totalSeamsCount: 0,
      },
    };

    const validation = validateCuttingPlanIntegrity(validResult, stockSheets, pieces, config);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.overlapsCount).toBe(0);
  });

  it("detects geometric overlap between two pieces on the same sheet", () => {
    const overlapResult: CalculationResult = {
      stockSheetsUsed: [
        {
          sheetIndex: 1,
          stockType: stockSheets[0],
          length: 1200,
          width: 600,
          usedArea: 0.24,
          wasteArea: 0.48,
          efficiency: 33.3,
          cutsCount: 4,
          placedPieces: [
            { id: "p1-1", name: "Tấm 1", x: 0, y: 0, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
            { id: "p1-2", name: "Tấm 1", x: 200, y: 100, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
          ],
        },
      ],
      joinedPieces: [],
      summary: {
        totalStockSheets: 1,
        sheetBreakdown: { "1200x600": 1 },
        totalRequiredArea: 0.24,
        totalStockArea: 0.72,
        totalUsedArea: 0.24,
        totalWasteArea: 0.48,
        efficiencyPercent: 33.3,
        totalCutsCount: 4,
        totalSeamsCount: 0,
      },
    };

    const validation = validateCuttingPlanIntegrity(overlapResult, stockSheets, pieces, config);
    expect(validation.isValid).toBe(false);
    expect(validation.overlapsCount).toBeGreaterThan(0);
  });

  it("detects piece placed outside sheet boundaries", () => {
    const oobResult: CalculationResult = {
      stockSheetsUsed: [
        {
          sheetIndex: 1,
          stockType: stockSheets[0],
          length: 1200,
          width: 600,
          usedArea: 0.24,
          wasteArea: 0.48,
          efficiency: 33.3,
          cutsCount: 4,
          placedPieces: [
            { id: "p1-1", name: "Tấm 1", x: 900, y: 400, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
          ],
        },
      ],
      joinedPieces: [],
      summary: {
        totalStockSheets: 1,
        sheetBreakdown: { "1200x600": 1 },
        totalRequiredArea: 0.24,
        totalStockArea: 0.72,
        totalUsedArea: 0.24,
        totalWasteArea: 0.48,
        efficiencyPercent: 33.3,
        totalCutsCount: 4,
        totalSeamsCount: 0,
      },
    };

    const validation = validateCuttingPlanIntegrity(oobResult, stockSheets, pieces, config);
    expect(validation.isValid).toBe(false);
    expect(validation.outOfBoundsCount).toBeGreaterThan(0);
  });
});
