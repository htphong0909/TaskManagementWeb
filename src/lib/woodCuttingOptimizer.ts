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
import { decomposeOversizedPieces } from "./woodDecomposer";

const DEFAULT_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};

const PASTEL_COLORS = [
  "#a78bfa", // violet
  "#38bdf8", // sky
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#818cf8", // indigo
  "#2dd4bf", // teal
  "#fb923c", // orange
  "#a3e635", // lime
];

interface StockSheetState {
  stockType: StockSheetInput;
  length: number;
  width: number;
  placedPieces: PlacedPiece[];
  freeRects: FreeRectangle[];
  cutsCount: number;
}

export function calculateWoodCut(
  stockSheets: StockSheetInput[],
  requiredPieces: RequiredPieceInput[],
  customConfig?: Partial<CalculationConfig>
): CalculationResult {
  const config: CalculationConfig = { ...DEFAULT_CONFIG, ...customConfig };

  if (stockSheets.length === 0 || requiredPieces.length === 0) {
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

  // 1. Phân rã các tấm vượt khổ
  const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(
    requiredPieces,
    stockSheets,
    config
  );

  // Gán màu sắc cho từng loại item
  const colorMap = new Map<string, string>();
  let colorIdx = 0;
  flatCutItems.forEach((item) => {
    const key = "parentId" in item ? item.parentId : item.name;
    if (!colorMap.has(key)) {
      colorMap.set(key, PASTEL_COLORS[colorIdx % PASTEL_COLORS.length]);
      colorIdx++;
    }
  });

  // 2. Sắp xếp giảm dần diện tích (Best-Fit Decreasing)
  const itemsToPack = [...flatCutItems].sort((a, b) => {
    const areaA = a.length * a.width;
    const areaB = b.length * b.width;
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.length, b.width) - Math.max(a.length, a.width);
  });

  const activeSheets: StockSheetState[] = [];

  // Hàm mở 1 tấm ván gốc mới
  const openNewSheet = (preferredStock?: StockSheetInput): StockSheetState => {
    const stock = preferredStock || stockSheets[0];
    const newSheet: StockSheetState = {
      stockType: stock,
      length: stock.length,
      width: stock.width,
      placedPieces: [],
      freeRects: [{ x: 0, y: 0, width: stock.length, height: stock.width }],
      cutsCount: 0,
    };
    activeSheets.push(newSheet);
    return newSheet;
  };

  // 3. Xếp từng tấm vào khoảng trống tự do
  for (const item of itemsToPack) {
    const isSub = "parentId" in item;
    const itemName = "parentName" in item ? `${item.parentName} (Tấm con)` : (item as RequiredPieceInput).name;
    const itemColor = colorMap.get(isSub ? (item as SubPiece).parentId : (item as RequiredPieceInput).name) || PASTEL_COLORS[0];
    const allowRotation = item.allowRotation;

    let bestSheetIdx = -1;
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestShortSideFit = Number.MAX_VALUE;

    // Tìm kiếm vị trí tốt nhất trong các tấm đã mở (Best Short Side Fit)
    for (let sIdx = 0; sIdx < activeSheets.length; sIdx++) {
      const sheet = activeSheets[sIdx];
      for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
        const rect = sheet.freeRects[rIdx];

        // Thử hướng bình thường (length x width)
        if (item.length <= rect.width && item.width <= rect.height) {
          const leftoverW = rect.width - item.length;
          const leftoverH = rect.height - item.width;
          const shortSideFit = Math.min(leftoverW, leftoverH);
          if (shortSideFit < bestShortSideFit) {
            bestShortSideFit = shortSideFit;
            bestSheetIdx = sIdx;
            bestRectIdx = rIdx;
            bestRotated = false;
          }
        }

        // Thử hướng xoay 90 độ (width x length)
        if (allowRotation && item.width <= rect.width && item.length <= rect.height) {
          const leftoverW = rect.width - item.width;
          const leftoverH = rect.height - item.length;
          const shortSideFit = Math.min(leftoverW, leftoverH);
          if (shortSideFit < bestShortSideFit) {
            bestShortSideFit = shortSideFit;
            bestSheetIdx = sIdx;
            bestRectIdx = rIdx;
            bestRotated = true;
          }
        }
      }
    }

    // Nếu không vừa trong bất kỳ tấm đã mở nào -> Mở tấm mới
    if (bestSheetIdx === -1) {
      // Tìm loại ván gốc phù hợp nhất
      const suitableStock = stockSheets.find((s) => {
        const fitN = item.length <= s.length && item.width <= s.width;
        const fitR = allowRotation && item.width <= s.length && item.length <= s.width;
        return fitN || fitR;
      }) || stockSheets[0];

      const newSheet = openNewSheet(suitableStock);
      bestSheetIdx = activeSheets.length - 1;
      bestRectIdx = 0;
      const rect = newSheet.freeRects[0];

      if (allowRotation && item.width <= rect.width && item.length <= rect.height && item.length > rect.width) {
        bestRotated = true;
      } else {
        bestRotated = false;
      }
    }

    // Đặt tấm vào vị trí
    const targetSheet = activeSheets[bestSheetIdx];
    const targetRect = targetSheet.freeRects.splice(bestRectIdx, 1)[0];

    const placedW = bestRotated ? item.width : item.length;
    const placedH = bestRotated ? item.length : item.width;

    const placedPiece: PlacedPiece = {
      id: item.id,
      name: itemName,
      isSubPiece: isSub,
      parentId: isSub ? (item as SubPiece).parentId : undefined,
      parentName: isSub ? (item as SubPiece).parentName : undefined,
      x: targetRect.x,
      y: targetRect.y,
      length: placedW,
      width: placedH,
      rotated: bestRotated,
      color: itemColor,
    };
    targetSheet.placedPieces.push(placedPiece);
    targetSheet.cutsCount += 2;

    // 4. Guillotine Split khoảng trống còn lại (Shorter Axis Split có tính mạch cưa kerf)
    const k = config.kerf;
    const remRightW = targetRect.width - placedW - k;
    const remBottomH = targetRect.height - placedH - k;

    if (remRightW > 0 && placedH > 0) {
      targetSheet.freeRects.push({
        x: targetRect.x + placedW + k,
        y: targetRect.y,
        width: remRightW,
        height: placedH,
      });
    }

    if (remBottomH > 0 && targetRect.width > 0) {
      targetSheet.freeRects.push({
        x: targetRect.x,
        y: targetRect.y + placedH + k,
        width: targetRect.width,
        height: remBottomH,
      });
    }

    // Lọc bỏ các khoảng trống quá nhỏ
    targetSheet.freeRects = targetSheet.freeRects.filter(
      (r) => r.width >= 10 && r.height >= 10
    );
  }

  // 5. Tổng hợp kết quả đầu ra
  let totalStockArea = 0;
  let totalUsedArea = 0;
  let totalCuts = 0;
  const sheetBreakdown: { [key: string]: number } = {};

  const stockSheetsUsed: PlacedStockSheet[] = activeSheets.map((sheet, index) => {
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
    totalCuts += sheet.cutsCount;

    return {
      sheetIndex: index + 1,
      stockType: sheet.stockType,
      length: sheet.length,
      width: sheet.width,
      placedPieces: sheet.placedPieces,
      usedArea: parseFloat(uArea.toFixed(3)),
      wasteArea: parseFloat(wasteArea.toFixed(3)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      cutsCount: sheet.cutsCount,
    };
  });

  // Map stockSheetIndex cho từng SubPiece trong joinedDiagrams
  const pieceSheetMap = new Map<string, number>();
  stockSheetsUsed.forEach((sheet) => {
    sheet.placedPieces.forEach((p) => {
      pieceSheetMap.set(p.id, sheet.sheetIndex);
    });
  });

  joinedDiagrams.forEach((diagram) => {
    diagram.subPieces.forEach((sp) => {
      sp.stockSheetIndex = pieceSheetMap.get(sp.id);
    });
  });

  const totalRequiredArea = requiredPieces.reduce(
    (acc, p) => acc + (p.length * p.width * p.quantity) / 1_000_000,
    0
  );
  const totalWasteArea = Math.max(0, totalStockArea - totalUsedArea);
  const efficiencyPercent =
    totalStockArea > 0 ? (totalUsedArea / totalStockArea) * 100 : 0;
  const totalSeamsCount = joinedDiagrams.reduce(
    (acc, d) => acc + d.seamCount,
    0
  );

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
      totalCutsCount: totalCuts,
      totalSeamsCount,
    },
  };
}
