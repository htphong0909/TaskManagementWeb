import { describe, it, expect } from "vitest";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";

describe("Wood Cutting Grain Physical Constraints", () => {
  const stock: StockSheetInput[] = [
    { id: "s1", length: 1200, width: 600 },
  ];

  describe("Standard vertical grain stock (stockGrain = 'vertical')", () => {
    it("should NOT rotate piece when piece grain matches stock grain (vertical)", () => {
      const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "vertical" };
      const pieces: RequiredPieceInput[] = [
        { id: "p1", name: "Cùng vân dọc", length: 500, width: 200, quantity: 1, grain: "vertical" },
      ];
      const res = calculateWoodCut(stock, pieces, config);
      expect(res.stockSheetsUsed).toHaveLength(1);
      const placed = res.stockSheetsUsed[0].placedPieces[0];
      expect(placed.rotated).toBe(false);
      expect(placed.length).toBe(500);
      expect(placed.width).toBe(200);
    });

    it("should ROTATE piece 90 degrees when piece grain opposes stock grain (horizontal on vertical stock)", () => {
      const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "vertical" };
      const pieces: RequiredPieceInput[] = [
        { id: "p1", name: "Khác vân ngang", length: 500, width: 200, quantity: 1, grain: "horizontal" },
      ];
      const res = calculateWoodCut(stock, pieces, config);
      expect(res.stockSheetsUsed).toHaveLength(1);
      const placed = res.stockSheetsUsed[0].placedPieces[0];
      expect(placed.rotated).toBe(true);
      expect(placed.length).toBe(200);
      expect(placed.width).toBe(500);
    });
  });

  describe("Horizontal grain stock (stockGrain = 'horizontal')", () => {
    it("should NOT rotate piece when piece grain matches stock grain (horizontal)", () => {
      const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "horizontal" };
      const pieces: RequiredPieceInput[] = [
        { id: "p1", name: "Cùng vân ngang", length: 500, width: 200, quantity: 1, grain: "horizontal" },
      ];
      const res = calculateWoodCut(stock, pieces, config);
      expect(res.stockSheetsUsed).toHaveLength(1);
      const placed = res.stockSheetsUsed[0].placedPieces[0];
      expect(placed.rotated).toBe(false);
      expect(placed.length).toBe(500);
      expect(placed.width).toBe(200);
    });

    it("should ROTATE piece 90 degrees when piece grain opposes stock grain (vertical on horizontal stock)", () => {
      const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "horizontal" };
      const pieces: RequiredPieceInput[] = [
        { id: "p1", name: "Khác vân dọc", length: 500, width: 200, quantity: 1, grain: "vertical" },
      ];
      const res = calculateWoodCut(stock, pieces, config);
      expect(res.stockSheetsUsed).toHaveLength(1);
      const placed = res.stockSheetsUsed[0].placedPieces[0];
      expect(placed.rotated).toBe(true);
      expect(placed.length).toBe(200);
      expect(placed.width).toBe(500);
    });
  });

  describe("No grain stock (stockGrain = 'none')", () => {
    it("should allow free rotation when stockGrain is 'none'", () => {
      const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "none" };
      const pieces: RequiredPieceInput[] = [
        { id: "p1", name: "Tự do", length: 500, width: 200, quantity: 1, grain: "vertical" },
      ];
      const res = calculateWoodCut(stock, pieces, config);
      expect(res.stockSheetsUsed).toHaveLength(1);
      expect(res.stockSheetsUsed[0].placedPieces).toHaveLength(1);
    });
  });
});
