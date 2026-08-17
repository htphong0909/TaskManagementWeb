import { describe, it, expect } from "vitest";
import { decomposeOversizedPieces } from "../woodDecomposer";
import { RequiredPieceInput, StockSheetInput } from "@/types/woodCut";

describe("woodDecomposer", () => {
  const stockSheets: StockSheetInput[] = [
    { id: "s1", length: 1200, width: 600 }
  ];
  const config = { kerf: 3, minSubPieceSize: 50 };

  it("creates single-piece diagram with 0 seams for normal sized pieces", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm nhỏ", length: 234, width: 234, quantity: 1, allowRotation: true }
    ];
    const result = decomposeOversizedPieces(pieces, stockSheets, config);
    expect(result.joinedDiagrams).toHaveLength(1);
    expect(result.joinedDiagrams[0].seamCount).toBe(0);
    expect(result.flatCutItems).toHaveLength(1);
    expect(result.flatCutItems[0].length).toBe(234);
  });

  it("decomposes 1110x1230 piece using 1200x600 stock with minimal seams", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p2", name: "Mặt bàn lớn", length: 1110, width: 1230, quantity: 1, allowRotation: true }
    ];
    const result = decomposeOversizedPieces(pieces, stockSheets, config);
    expect(result.joinedDiagrams).toHaveLength(1);
    const diagram = result.joinedDiagrams[0];
    expect(diagram.targetLength).toBe(1110);
    expect(diagram.targetWidth).toBe(1230);
    expect(diagram.subPieces.length).toBeGreaterThanOrEqual(2);
    // Tổng diện tích các tấm con xấp xỉ diện tích tấm lớn
    const totalSubArea = diagram.subPieces.reduce((acc, sp) => acc + sp.length * sp.width, 0);
    expect(totalSubArea).toBeCloseTo(1110 * 1230, -2);
  });
});
