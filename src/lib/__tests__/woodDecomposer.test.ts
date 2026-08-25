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
      { id: "p1", name: "Tấm nhỏ", length: 234, width: 234, quantity: 1, orientation: "auto", allowRotation: true }
    ];
    const result = decomposeOversizedPieces(pieces, stockSheets, config);
    expect(result.joinedDiagrams).toHaveLength(1);
    expect(result.joinedDiagrams[0].seamCount).toBe(0);
    expect(result.flatCutItems).toHaveLength(1);
    expect(result.flatCutItems[0].length).toBe(234);
  });

  it("decomposes 1110x1230 piece using 1200x600 stock with minimal seams", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p2", name: "Mặt bàn lớn", length: 1110, width: 1230, quantity: 1, orientation: "auto", allowRotation: true }
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

  it("preserves vertical orientation during decomposition", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p3", name: "Mặt dọc lớn", length: 1110, width: 1230, quantity: 1, orientation: "vertical", allowRotation: false }
    ];
    const result = decomposeOversizedPieces(pieces, stockSheets, config);
    expect(result.joinedDiagrams).toHaveLength(1);
    const diagram = result.joinedDiagrams[0];
    expect(diagram.targetLength).toBe(1110);
    expect(diagram.targetWidth).toBe(1230);
    diagram.subPieces.forEach((sp) => {
      expect(sp.orientation).toBe("vertical");
      expect(sp.allowRotation).toBe(false);
    });
  });

  it("decomposes extreme oversized piece (4002 x 12210) on stock (2440 x 1220) into valid subpieces", () => {
    const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm đại", length: 4002, width: 12210, quantity: 1, allowRotation: true },
    ];

    const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(pieces, stock, { kerf: 3, minSubPieceSize: 50 });

    expect(joinedDiagrams).toHaveLength(1);
    expect(joinedDiagrams[0].subPieces.length).toBeGreaterThanOrEqual(10);

    // 100% mọi mảnh con phải nằm gọn trong ván gốc 2440 x 1220 (hoặc xoay 1220 x 2440)
    for (const sp of flatCutItems) {
      const fitsNormal = sp.length <= 2440 && sp.width <= 1220;
      const fitsRotated = sp.length <= 1220 && sp.width <= 2440;
      expect(fitsNormal || fitsRotated).toBe(true);
    }
  });
});
