import {
  StockSheetInput,
  RequiredPieceInput,
  CalculationConfig,
  CalculationResult,
  PlacedStockSheet,
  PlacedPiece,
  FreeRectangle,
  SubPiece,
} from "@/types/woodCut";
import { decomposeOversizedPieces } from "../woodDecomposer";

const DEFAULT_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};

interface GTSheetState {
  stockType: StockSheetInput;
  length: number;
  width: number;
  placedPieces: PlacedPiece[];
  freeRects: FreeRectangle[];
}

interface BestSolution {
  sheets: GTSheetState[];
  sheetCount: number;
  wasteArea: number;
}

function cloneSheets(sheets: GTSheetState[]): GTSheetState[] {
  return sheets.map((s) => ({
    stockType: s.stockType,
    length: s.length,
    width: s.width,
    placedPieces: s.placedPieces.map((p) => ({ ...p })),
    freeRects: s.freeRects.map((r) => ({ ...r })),
  }));
}

function calculateWaste(sheets: GTSheetState[]): number {
  let totalStock = 0;
  let totalUsed = 0;
  for (const s of sheets) {
    totalStock += s.length * s.width;
    for (const p of s.placedPieces) {
      totalUsed += p.length * p.width;
    }
  }
  return Math.max(0, totalStock - totalUsed);
}

function splitRect(
  targetRect: FreeRectangle,
  placedW: number,
  placedH: number,
  kerf: number,
  horizontalFirst: boolean
): FreeRectangle[] {
  const remW = targetRect.width - placedW - kerf;
  const remH = targetRect.height - placedH - kerf;
  const newRects: FreeRectangle[] = [];

  if (horizontalFirst) {
    if (remW > 0 && placedH > 0) {
      newRects.push({
        x: targetRect.x + placedW + kerf,
        y: targetRect.y,
        width: remW,
        height: placedH,
      });
    }
    if (remH > 0 && targetRect.width > 0) {
      newRects.push({
        x: targetRect.x,
        y: targetRect.y + placedH + kerf,
        width: targetRect.width,
        height: remH,
      });
    }
  } else {
    if (remW > 0 && targetRect.height > 0) {
      newRects.push({
        x: targetRect.x + placedW + kerf,
        y: targetRect.y,
        width: remW,
        height: targetRect.height,
      });
    }
    if (remH > 0 && placedW > 0) {
      newRects.push({
        x: targetRect.x,
        y: targetRect.y + placedH + kerf,
        width: placedW,
        height: remH,
      });
    }
  }

  return newRects;
}

export function solveGroundTruth(
  stockSheets: StockSheetInput[],
  requiredPieces: RequiredPieceInput[],
  customConfig?: Partial<CalculationConfig>
): CalculationResult {
  const config: CalculationConfig = { ...DEFAULT_CONFIG, ...customConfig };

  const validStock = (stockSheets || []).filter(
    (s) => s && s.length > 0 && s.width > 0
  );
  const validPieces = (requiredPieces || [])
    .filter((p) => p && p.length > 0 && p.width > 0 && p.quantity > 0)
    .map((p) => ({ ...p, allowRotation: p.allowRotation !== false }));

  if (validStock.length === 0 || validPieces.length === 0) {
    return {
      stockSheetsUsed: [],
      joinedPieces: [],
      summary: {
        totalStockSheets: 0,
        sheetBreakdown: {},
        totalRequiredArea: 0,
        totalStockArea: 0,
        totalUsedArea: 0,
        totalWasteArea: 0,
        efficiencyPercent: 0,
        totalCutsCount: 0,
        totalSeamsCount: 0,
      },
    };
  }

  const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(
    validPieces,
    validStock,
    config
  );

  // Sắp xếp các mảnh cần xếp theo diện tích giảm dần để duyệt nhánh lớn trước
  const items = [...flatCutItems].sort(
    (a, b) => b.length * b.width - a.length * a.width
  );

  const totalItemArea = items.reduce((acc, it) => acc + it.length * it.width, 0);
  const maxStockArea = Math.max(...validStock.map((s) => s.length * s.width));
  const minTheoreticalSheets = Math.max(1, Math.ceil(totalItemArea / maxStockArea));

  const bestSolution: BestSolution = {
    sheets: [],
    sheetCount: items.length + 1,
    wasteArea: Number.MAX_VALUE,
  };

  const remainingSuffixAreas: number[] = new Array(items.length + 1).fill(0);
  for (let i = items.length - 1; i >= 0; i--) {
    remainingSuffixAreas[i] = remainingSuffixAreas[i + 1] + items[i].length * items[i].width;
  }

  function backtrack(
    itemIdx: number,
    currentSheets: GTSheetState[]
  ): void {
    if (itemIdx === items.length) {
      const waste = calculateWaste(currentSheets);
      if (
        currentSheets.length < bestSolution.sheetCount ||
        (currentSheets.length === bestSolution.sheetCount && waste < bestSolution.wasteArea)
      ) {
        bestSolution.sheetCount = currentSheets.length;
        bestSolution.wasteArea = waste;
        bestSolution.sheets = cloneSheets(currentSheets);
      }
      return;
    }

    // Branch & Bound Pruning:
    // 1. Nếu số tấm hiện tại đã >= bestSolution.sheetCount thì không thể tối ưu hơn
    if (currentSheets.length >= bestSolution.sheetCount) {
      return;
    }

    // 2. Lower bound ước lượng số tấm cần thêm
    const remArea = remainingSuffixAreas[itemIdx];
    const estimatedSheets = currentSheets.length + Math.ceil(remArea / maxStockArea);
    if (estimatedSheets > bestSolution.sheetCount) {
      return;
    }

    const item = items[itemIdx];
    const isSub = Boolean("parentId" in item && item.id.startsWith("sub-"));
    const itemName = "parentName" in item
      ? isSub
        ? `${item.parentName} (Tấm con)`
        : item.parentName
      : (item as RequiredPieceInput).name;
    const allowRotation = item.allowRotation !== false;

    const orientations: { w: number; h: number; rotated: boolean }[] = [
      { w: item.length, h: item.width, rotated: false },
    ];
    if (allowRotation && item.length !== item.width) {
      orientations.push({ w: item.width, h: item.length, rotated: true });
    }

    // A. Thử đặt vào các tấm đã mở
    for (let sIdx = 0; sIdx < currentSheets.length; sIdx++) {
      const sheet = currentSheets[sIdx];
      for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
        const rect = sheet.freeRects[rIdx];

        for (const orient of orientations) {
          if (orient.w <= rect.width && orient.h <= rect.height) {
            for (const hFirst of [true, false]) {
              const placedPiece: PlacedPiece = {
                id: item.id,
                name: itemName,
                isSubPiece: isSub,
                parentId: isSub ? (item as SubPiece).parentId : undefined,
                parentName: isSub ? (item as SubPiece).parentName : undefined,
                x: rect.x,
                y: rect.y,
                length: orient.w,
                width: orient.h,
                rotated: orient.rotated,
                color: "#a78bfa",
              };

              const newSplits = splitRect(rect, orient.w, orient.h, config.kerf, hFirst);

              // Áp dụng đặt
              sheet.placedPieces.push(placedPiece);
              const removedRect = sheet.freeRects.splice(rIdx, 1)[0];
              sheet.freeRects.push(...newSplits);

              backtrack(itemIdx + 1, currentSheets);

              // Hoàn tác
              sheet.placedPieces.pop();
              sheet.freeRects.splice(sheet.freeRects.length - newSplits.length, newSplits.length);
              sheet.freeRects.splice(rIdx, 0, removedRect);

              // Nếu đã đạt theoretical lower bound với 0 waste thêm thì có thể dừng sớm
              if (
                bestSolution.sheetCount === minTheoreticalSheets &&
                bestSolution.wasteArea === 0
              ) {
                return;
              }
            }
          }
        }
      }
    }

    // B. Thử mở tấm ván mới (nếu chưa vượt quá best known)
    if (currentSheets.length + 1 < bestSolution.sheetCount) {
      for (const stock of validStock) {
        for (const orient of orientations) {
          if (orient.w <= stock.length && orient.h <= stock.width) {
            for (const hFirst of [true, false]) {
              const newSheet: GTSheetState = {
                stockType: stock,
                length: stock.length,
                width: stock.width,
                placedPieces: [
                  {
                    id: item.id,
                    name: itemName,
                    isSubPiece: isSub,
                    parentId: isSub ? (item as SubPiece).parentId : undefined,
                    parentName: isSub ? (item as SubPiece).parentName : undefined,
                    x: 0,
                    y: 0,
                    length: orient.w,
                    width: orient.h,
                    rotated: orient.rotated,
                    color: "#a78bfa",
                  },
                ],
                freeRects: splitRect(
                  { x: 0, y: 0, width: stock.length, height: stock.width },
                  orient.w,
                  orient.h,
                  config.kerf,
                  hFirst
                ),
              };

              currentSheets.push(newSheet);
              backtrack(itemIdx + 1, currentSheets);
              currentSheets.pop();

              if (
                bestSolution.sheetCount === minTheoreticalSheets &&
                bestSolution.wasteArea === 0
              ) {
                return;
              }
            }
          }
        }
      }
    }
  }

  backtrack(0, []);

  // Tổng hợp kết quả đầu ra
  let totalStockArea = 0;
  let totalUsedArea = 0;
  const sheetBreakdown: { [key: string]: number } = {};

  const stockSheetsUsed: PlacedStockSheet[] = bestSolution.sheets.map((sheet, index) => {
    const sKey = `${sheet.length}x${sheet.width}`;
    sheetBreakdown[sKey] = (sheetBreakdown[sKey] || 0) + 1;

    const sArea = (sheet.length * sheet.width) / 1_000_000;
    const uArea = sheet.placedPieces.reduce(
      (acc, p) => acc + (p.length * p.width) / 1_000_000,
      0
    );
    const wasteArea = Math.max(0, sArea - uArea);
    const efficiency = sArea > 0 ? (uArea / sArea) * 100 : 0;

    totalStockArea += sArea;
    totalUsedArea += uArea;

    return {
      sheetIndex: index + 1,
      stockType: sheet.stockType,
      length: sheet.length,
      width: sheet.width,
      placedPieces: sheet.placedPieces,
      usedArea: parseFloat(uArea.toFixed(3)),
      wasteArea: parseFloat(wasteArea.toFixed(3)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      cutsCount: sheet.placedPieces.length * 2,
    };
  });

  const totalRequiredArea = validPieces.reduce(
    (acc, p) => acc + (p.length * p.width * p.quantity) / 1_000_000,
    0
  );
  const totalWasteArea = Math.max(0, totalStockArea - totalUsedArea);
  const efficiencyPercent =
    totalStockArea > 0 ? (totalUsedArea / totalStockArea) * 100 : 0;

  return {
    stockSheetsUsed,
    joinedPieces: joinedDiagrams,
    summary: {
      totalStockSheets: stockSheetsUsed.length,
      sheetBreakdown,
      totalRequiredArea: parseFloat(totalRequiredArea.toFixed(3)),
      totalStockArea: parseFloat(totalStockArea.toFixed(3)),
      totalUsedArea: parseFloat(totalUsedArea.toFixed(3)),
      totalWasteArea: parseFloat(totalWasteArea.toFixed(3)),
      efficiencyPercent: parseFloat(efficiencyPercent.toFixed(1)),
      totalCutsCount: stockSheetsUsed.reduce((acc, s) => acc + s.cutsCount, 0),
      totalSeamsCount: joinedDiagrams.reduce((acc, d) => acc + d.seamCount, 0),
    },
  };
}
