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

export function coalesceFreeRectangles(freeRects: FreeRectangle[]): FreeRectangle[] {
  const rects: FreeRectangle[] = freeRects.map((r) => ({ ...r }));
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];

        // 1. Gộp Dọc (cùng x, cùng width, tiếp xúc Y)
        if (a.x === b.x && a.width === b.width) {
          if (a.y + a.height === b.y) {
            a.height += b.height;
            rects.splice(j, 1);
            merged = true;
            break;
          } else if (b.y + b.height === a.y) {
            b.height += a.height;
            rects.splice(i, 1);
            merged = true;
            break;
          }
        }

        // 2. Gộp Ngang (cùng y, cùng height, tiếp xúc X)
        if (a.y === b.y && a.height === b.height) {
          if (a.x + a.width === b.x) {
            a.width += b.width;
            rects.splice(j, 1);
            merged = true;
            break;
          } else if (b.x + b.width === a.x) {
            b.width += a.width;
            rects.splice(i, 1);
            merged = true;
            break;
          }
        }
      }
      if (merged) break;
    }
  }

  return rects;
}

interface StockSheetState {
  stockType: StockSheetInput;
  length: number;
  width: number;
  placedPieces: PlacedPiece[];
  freeRects: FreeRectangle[];
  cutsCount: number;
}

type SortStrategy = "AREA_DESC" | "MAX_DIM_DESC" | "PERIMETER_DESC" | "ASPECT_RATIO_DESC" | "WIDTH_DESC" | "LENGTH_DESC";
type FitRule = "BSSF" | "BLSF" | "BAF";
type SplitRule = "SAS" | "LAS";

interface HeuristicVariant {
  sort: SortStrategy;
  fit: FitRule;
  split: SplitRule;
}

function sortItems(
  items: (RequiredPieceInput | SubPiece)[],
  strategy: SortStrategy
): (RequiredPieceInput | SubPiece)[] {
  const list = [...items];
  switch (strategy) {
    case "AREA_DESC":
      return list.sort((a, b) => {
        const diff = b.length * b.width - a.length * a.width;
        if (diff !== 0) return diff;
        return Math.max(b.length, b.width) - Math.max(a.length, a.width);
      });
    case "MAX_DIM_DESC":
      return list.sort((a, b) => {
        const diff = Math.max(b.length, b.width) - Math.max(a.length, a.width);
        if (diff !== 0) return diff;
        return b.length * b.width - a.length * a.width;
      });
    case "PERIMETER_DESC":
      return list.sort((a, b) => {
        const diff = b.length + b.width - (a.length + a.width);
        if (diff !== 0) return diff;
        return b.length * b.width - a.length * a.width;
      });
    case "ASPECT_RATIO_DESC":
      return list.sort((a, b) => {
        const ratioA = Math.max(a.length, a.width) / Math.min(a.length, a.width);
        const ratioB = Math.max(b.length, b.width) / Math.min(b.length, b.width);
        const diff = ratioB - ratioA;
        if (diff !== 0) return diff;
        return b.length * b.width - a.length * a.width;
      });
    case "WIDTH_DESC":
      return list.sort((a, b) => {
        const diff = b.width - a.width;
        if (diff !== 0) return diff;
        return b.length - a.length;
      });
    case "LENGTH_DESC":
      return list.sort((a, b) => {
        const diff = b.length - a.length;
        if (diff !== 0) return diff;
        return b.width - a.width;
      });
  }
}

function scoreFit(
  remW: number,
  remH: number,
  rule: FitRule
): number {
  switch (rule) {
    case "BSSF":
      return Math.min(remW, remH);
    case "BLSF":
      return Math.max(remW, remH);
    case "BAF":
      return remW * remH;
  }
}

export function packCandidate(
  items: (RequiredPieceInput | SubPiece)[],
  validStock: StockSheetInput[],
  config: CalculationConfig,
  variant: HeuristicVariant,

  colorMap: Map<string, string>
): StockSheetState[] {
  const sortedItems = sortItems(items, variant.sort);
  const activeSheets: StockSheetState[] = [];

  const openNewSheet = (preferredStock?: StockSheetInput): StockSheetState => {
    const stock = preferredStock || validStock[0];
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

  for (const item of sortedItems) {
    const isSub = Boolean("parentId" in item && item.id.startsWith("sub-"));
    const itemName = "parentName" in item
      ? isSub
        ? `${item.parentName} (Tấm con)`
        : item.parentName
      : (item as RequiredPieceInput).name;
    const itemColor = colorMap.get("parentId" in item ? (item as SubPiece).parentId : (item as RequiredPieceInput).name) || PASTEL_COLORS[0];
    const orient = item.orientation || (item.allowRotation === false ? "vertical" : "auto");
    const tryNormal = orient === "vertical" || orient === "auto";
    const tryRotated = orient === "horizontal" || orient === "auto";

    let bestSheetIdx = -1;
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestFitScore = Number.MAX_VALUE;

    // Tìm kiếm vị trí tốt nhất trong các tấm đã mở
    for (let sIdx = 0; sIdx < activeSheets.length; sIdx++) {
      const sheet = activeSheets[sIdx];
      for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
        const rect = sheet.freeRects[rIdx];

        // Hướng bình thường (length x width)
        if (tryNormal && item.length <= rect.width && item.width <= rect.height) {
          const remW = rect.width - item.length;
          const remH = rect.height - item.width;
          const score = scoreFit(remW, remH, variant.fit);
          if (score < bestFitScore) {
            bestFitScore = score;
            bestSheetIdx = sIdx;
            bestRectIdx = rIdx;
            bestRotated = false;
          }
        }

        // Hướng xoay 90 độ (width x length)
        if (tryRotated && item.width <= rect.width && item.length <= rect.height) {
          const remW = rect.width - item.width;
          const remH = rect.height - item.length;
          const score = scoreFit(remW, remH, variant.fit);
          if (score < bestFitScore) {
            bestFitScore = score;
            bestSheetIdx = sIdx;
            bestRectIdx = rIdx;
            bestRotated = true;
          }
        }
      }
    }

    // Nếu không vừa trong bất kỳ tấm đã mở nào -> Mở tấm mới
    if (bestSheetIdx === -1) {
      const suitableStock = validStock.find((s) => {
        const fitN = tryNormal && item.length <= s.length && item.width <= s.width;
        const fitR = tryRotated && item.width <= s.length && item.length <= s.width;
        return fitN || fitR;
      }) || validStock[0];

      const newSheet = openNewSheet(suitableStock);
      bestSheetIdx = activeSheets.length - 1;
      bestRectIdx = 0;
      const rect = newSheet.freeRects[0];

      const fitNormal = tryNormal && item.length <= rect.width && item.width <= rect.height;
      const fitRotated = tryRotated && item.width <= rect.width && item.length <= rect.height;

      if (fitNormal && fitRotated) {
        // Cả 2 hướng đều vừa tấm mới -> Chấm điểm xem hướng nào tối ưu hơn
        const remW1 = rect.width - item.length;
        const remH1 = rect.height - item.width;
        const score1 = scoreFit(remW1, remH1, variant.fit);

        const remW2 = rect.width - item.width;
        const remH2 = rect.height - item.length;
        const score2 = scoreFit(remW2, remH2, variant.fit);

        bestRotated = score2 < score1;
      } else if (fitRotated) {
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

    // Guillotine Split khoảng trống còn lại
    const k = config.kerf;
    const remW = targetRect.width - placedW - k;
    const remH = targetRect.height - placedH - k;

    if (remW > 0 || remH > 0) {
      const splitHorizontalFirst =
        variant.split === "SAS" ? remW <= remH : remW >= remH;

      if (splitHorizontalFirst) {
        // Chia ngang trước:
        // Mảnh bên phải (theo chiều cao của chi tiết vừa đặt)
        if (remW >= 10 && placedH >= 10) {
          targetSheet.freeRects.push({
            x: targetRect.x + placedW + k,
            y: targetRect.y,
            width: remW,
            height: placedH,
          });
        }
        // Mảnh phía dưới (toàn bộ chiều ngang targetRect)
        if (remH >= 10 && targetRect.width >= 10) {
          targetSheet.freeRects.push({
            x: targetRect.x,
            y: targetRect.y + placedH + k,
            width: targetRect.width,
            height: remH,
          });
        }
      } else {
        // Chia dọc trước:
        // Mảnh bên phải (toàn bộ chiều cao targetRect)
        if (remW >= 10 && targetRect.height >= 10) {
          targetSheet.freeRects.push({
            x: targetRect.x + placedW + k,
            y: targetRect.y,
            width: remW,
            height: targetRect.height,
          });
        }
        // Mảnh phía dưới (theo chiều rộng của chi tiết vừa đặt)
        if (remH >= 10 && placedW >= 10) {
          targetSheet.freeRects.push({
            x: targetRect.x,
            y: targetRect.y + placedH + k,
            width: placedW,
            height: remH,
          });
        }
      }
    }
  }

  return activeSheets;
}

export function calculateWoodCut(
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

  // 1. Phân rã các tấm vượt khổ
  const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(
    validPieces,
    validStock,
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

  // 2. Chạy Multi-Heuristic Ensemble tìm phương án tối ưu nhất
  const sortStrategies: SortStrategy[] = [
    "AREA_DESC",
    "MAX_DIM_DESC",
    "PERIMETER_DESC",
    "ASPECT_RATIO_DESC",
    "WIDTH_DESC",
    "LENGTH_DESC",
  ];
  const fitRules: FitRule[] = ["BSSF", "BLSF", "BAF"];
  const splitRules: SplitRule[] = ["SAS", "LAS"];

  let bestSheets: StockSheetState[] | null = null;
  let bestScore = Number.MAX_VALUE;

  for (const sort of sortStrategies) {
    for (const fit of fitRules) {
      for (const split of splitRules) {
        const candidateSheets = packCandidate(
          flatCutItems,
          validStock,
          config,
          { sort, fit, split },
          colorMap
        );

        // Tính điểm: Ưu tiên số tấm ít nhất, kế đến diện tích hao phí ít nhất, kế đến số đường cưa
        let candidateTotalStockArea = 0;
        let candidateTotalUsedArea = 0;
        let candidateTotalCuts = 0;

        for (const sheet of candidateSheets) {
          candidateTotalStockArea += sheet.length * sheet.width;
          candidateTotalCuts += sheet.cutsCount;
          for (const p of sheet.placedPieces) {
            candidateTotalUsedArea += p.length * p.width;
          }
        }

        const candidateWasteArea = Math.max(0, candidateTotalStockArea - candidateTotalUsedArea);
        const score =
          candidateSheets.length * 1_000_000_000 +
          candidateWasteArea * 1_000 +
          candidateTotalCuts * 10;

        if (score < bestScore || bestSheets === null) {
          bestScore = score;
          bestSheets = candidateSheets;
        }
      }
    }
  }

  const activeSheets = bestSheets || [];

  // 3. Tổng hợp kết quả đầu ra
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

  // Map stockSheetIndex, stockSheetName, và rotated cho từng SubPiece trong joinedDiagrams
  const pieceSheetMap = new Map<string, { sheetIndex: number; sheetName: string; rotated: boolean }>();
  stockSheetsUsed.forEach((sheet) => {
    sheet.placedPieces.forEach((p) => {
      pieceSheetMap.set(p.id, {
        sheetIndex: sheet.sheetIndex,
        sheetName: sheet.stockType.name ? `${sheet.stockType.name} (Ván ${sheet.sheetIndex})` : `Ván ${sheet.sheetIndex}`,
        rotated: p.rotated,
      });
    });
  });

  joinedDiagrams.forEach((diagram) => {
    diagram.subPieces.forEach((sp) => {
      const info = pieceSheetMap.get(sp.id);
      if (info) {
        sp.stockSheetIndex = info.sheetIndex;
        sp.stockSheetName = info.sheetName;
        sp.rotatedOnSheet = info.rotated;
      }
    });
  });

  const totalRequiredArea = validPieces.reduce(
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

