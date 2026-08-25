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

export type SortStrategy =
  | "AREA_DESC"
  | "MAX_DIM_DESC"
  | "MIN_DIM_DESC"
  | "PERIMETER_DESC"
  | "ASPECT_RATIO_DESC"
  | "WIDTH_DESC"
  | "LENGTH_DESC"
  | "COMBINED_PRIORITY_DESC"
  | "SIDE_RATIO_DESC"
  | "NONE";

export type FitRule = "BSSF" | "BLSF" | "BAF" | "BPCF";
export type SplitRule = "SAS" | "LAS" | "MINAS" | "MAXAS" | "SLAS" | "LLAS";

export interface HeuristicVariant {
  sort: SortStrategy;
  fit: FitRule;
  split: SplitRule;
  allocation?: SheetAllocationMode;
}

export function sortItems(
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
    case "MIN_DIM_DESC":
      return list.sort((a, b) => {
        const diff = Math.min(b.length, b.width) - Math.min(a.length, a.width);
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
        const ratioA = Math.max(a.length, a.width) / Math.max(1, Math.min(a.length, a.width));
        const ratioB = Math.max(b.length, b.width) / Math.max(1, Math.min(b.length, b.width));
        const diff = ratioB - ratioA;
        if (diff !== 0) return diff;
        return b.length * b.width - a.length * a.width;
      });
    case "SIDE_RATIO_DESC":
      return list.sort((a, b) => {
        const ratioA = Math.max(a.length, a.width) / Math.max(1, Math.min(a.length, a.width));
        const ratioB = Math.max(b.length, b.width) / Math.max(1, Math.min(b.length, b.width));
        const diff = ratioB - ratioA;
        if (diff !== 0) return diff;
        return b.length * b.width - a.length * a.width;
      });
    case "COMBINED_PRIORITY_DESC":
      return list.sort((a, b) => {
        const scoreA = a.length * a.width * 10 + (a.length + a.width) * 5 + Math.max(a.length, a.width);
        const scoreB = b.length * b.width * 10 + (b.length + b.width) * 5 + Math.max(b.length, b.width);
        return scoreB - scoreA;
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
    case "NONE":
      return list;
  }
}

export function scoreFit(
  remW: number,
  remH: number,
  placedX: number = 0,
  placedY: number = 0,
  placedW: number = 0,
  placedH: number = 0,
  sheetW: number = 0,
  sheetH: number = 0,
  rule: FitRule = "BSSF"
): number {
  switch (rule) {
    case "BSSF":
      return Math.min(remW, remH);
    case "BLSF":
      return Math.max(remW, remH);
    case "BAF":
      return remW * remH;
    case "BPCF": {
      let contactPerimeter = 0;
      if (placedX === 0) contactPerimeter += placedH;
      if (placedY === 0) contactPerimeter += placedW;
      if (sheetW > 0 && placedX + placedW === sheetW) contactPerimeter += placedH;
      if (sheetH > 0 && placedY + placedH === sheetH) contactPerimeter += placedW;
      return -contactPerimeter * 1000 + (remW * remH) / 1000;
    }
  }
}

export function splitFreeRectangle(
  targetRect: FreeRectangle,
  placedW: number,
  placedH: number,
  kerf: number,
  rule: SplitRule
): FreeRectangle[] {
  const remW = targetRect.width - placedW - kerf;
  const remH = targetRect.height - placedH - kerf;
  if (remW <= 0 && remH <= 0) return [];

  let splitHorizontalFirst: boolean;

  switch (rule) {
    case "SAS":
      splitHorizontalFirst = placedW <= placedH;
      break;
    case "LAS":
      splitHorizontalFirst = placedW >= placedH;
      break;
    case "MINAS": {
      const minAreaHoriz = Math.min(remW * placedH, targetRect.width * remH);
      const minAreaVert = Math.min(remW * targetRect.height, placedW * remH);
      splitHorizontalFirst = minAreaHoriz <= minAreaVert;
      break;
    }
    case "MAXAS": {
      const maxAreaHoriz = Math.max(remW * placedH, targetRect.width * remH);
      const maxAreaVert = Math.max(remW * targetRect.height, placedW * remH);
      splitHorizontalFirst = maxAreaHoriz >= maxAreaVert;
      break;
    }
    case "SLAS":
      splitHorizontalFirst = remW <= remH;
      break;
    case "LLAS":
      splitHorizontalFirst = remW >= remH;
      break;
  }

  const result: FreeRectangle[] = [];
  if (splitHorizontalFirst) {
    if (remW >= 5 && placedH >= 5) {
      result.push({
        x: targetRect.x + placedW + kerf,
        y: targetRect.y,
        width: remW,
        height: placedH,
      });
    }
    if (remH >= 5 && targetRect.width >= 5) {
      result.push({
        x: targetRect.x,
        y: targetRect.y + placedH + kerf,
        width: targetRect.width,
        height: remH,
      });
    }
  } else {
    if (remW >= 5 && targetRect.height >= 5) {
      result.push({
        x: targetRect.x + placedW + kerf,
        y: targetRect.y,
        width: remW,
        height: targetRect.height,
      });
    }
    if (remH >= 5 && placedW >= 5) {
      result.push({
        x: targetRect.x,
        y: targetRect.y + placedH + kerf,
        width: placedW,
        height: remH,
      });
    }
  }

  return result;
}

export type SheetAllocationMode = "GLOBAL_BEST_FIT" | "SHEET_BY_SHEET";

export interface HeuristicVariant {
  sort: SortStrategy;
  fit: FitRule;
  split: SplitRule;
  allocation?: SheetAllocationMode;
}

export function evaluateCandidateScore(candidateSheets: StockSheetState[]): number {
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
  return (
    candidateSheets.length * 1_000_000_000 +
    candidateWasteArea * 1_000 +
    candidateTotalCuts * 10
  );
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
  const allocation = variant.allocation || "GLOBAL_BEST_FIT";

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

    if (allocation === "SHEET_BY_SHEET" && activeSheets.length > 0) {
      const curIdx = activeSheets.length - 1;
      const sheet = activeSheets[curIdx];
      for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
        const rect = sheet.freeRects[rIdx];

        if (tryNormal && item.length <= rect.width && item.width <= rect.height) {
          const remW = rect.width - item.length;
          const remH = rect.height - item.width;
          const score = scoreFit(remW, remH, rect.x, rect.y, item.length, item.width, sheet.length, sheet.width, variant.fit);
          if (score < bestFitScore) {
            bestFitScore = score;
            bestSheetIdx = curIdx;
            bestRectIdx = rIdx;
            bestRotated = false;
          }
        }

        if (tryRotated && item.width <= rect.width && item.length <= rect.height) {
          const remW = rect.width - item.width;
          const remH = rect.height - item.length;
          const score = scoreFit(remW, remH, rect.x, rect.y, item.width, item.length, sheet.length, sheet.width, variant.fit);
          if (score < bestFitScore) {
            bestFitScore = score;
            bestSheetIdx = curIdx;
            bestRectIdx = rIdx;
            bestRotated = true;
          }
        }
      }
    }

    if (bestSheetIdx === -1) {
      for (let sIdx = 0; sIdx < activeSheets.length; sIdx++) {
        const sheet = activeSheets[sIdx];
        for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
          const rect = sheet.freeRects[rIdx];

          if (tryNormal && item.length <= rect.width && item.width <= rect.height) {
            const remW = rect.width - item.length;
            const remH = rect.height - item.width;
            const score = scoreFit(remW, remH, rect.x, rect.y, item.length, item.width, sheet.length, sheet.width, variant.fit);
            if (score < bestFitScore) {
              bestFitScore = score;
              bestSheetIdx = sIdx;
              bestRectIdx = rIdx;
              bestRotated = false;
            }
          }

          if (tryRotated && item.width <= rect.width && item.length <= rect.height) {
            const remW = rect.width - item.width;
            const remH = rect.height - item.length;
            const score = scoreFit(remW, remH, rect.x, rect.y, item.width, item.length, sheet.length, sheet.width, variant.fit);
            if (score < bestFitScore) {
              bestFitScore = score;
              bestSheetIdx = sIdx;
              bestRectIdx = rIdx;
              bestRotated = true;
            }
          }
        }
      }
    }

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
        const remW1 = rect.width - item.length;
        const remH1 = rect.height - item.width;
        const score1 = scoreFit(remW1, remH1, rect.x, rect.y, item.length, item.width, newSheet.length, newSheet.width, variant.fit);

        const remW2 = rect.width - item.width;
        const remH2 = rect.height - item.length;
        const score2 = scoreFit(remW2, remH2, rect.x, rect.y, item.width, item.length, newSheet.length, newSheet.width, variant.fit);

        bestRotated = score2 < score1;
      } else if (fitRotated) {
        bestRotated = true;
      } else {
        bestRotated = false;
      }
    }

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

    const newSplits = splitFreeRectangle(
      targetRect,
      placedW,
      placedH,
      config.kerf,
      variant.split
    );
    targetSheet.freeRects.push(...newSplits);
    targetSheet.freeRects = coalesceFreeRectangles(targetSheet.freeRects);
  }

  return activeSheets;
}

export const INPUT_LIMITS = {
  MIN_STOCK_DIM: 100,
  MAX_STOCK_DIM: 10000,
  MIN_PIECE_DIM: 10,
  MAX_PIECE_DIM: 30000,
  MAX_QUANTITY_PER_PIECE: 500,
  MAX_TOTAL_SUBPIECES: 500,
  MAX_KERF: 50,
};

export function calculateWoodCut(
  stockSheets: StockSheetInput[],
  requiredPieces: RequiredPieceInput[],
  customConfig?: Partial<CalculationConfig>
): CalculationResult {
  const config: CalculationConfig = {
    ...DEFAULT_CONFIG,
    ...customConfig,
    kerf: Math.max(0, Math.min(INPUT_LIMITS.MAX_KERF, customConfig?.kerf ?? DEFAULT_CONFIG.kerf)),
  };

  const validStock = (stockSheets || [])
    .filter((s) => s && s.length > 0 && s.width > 0 && !isNaN(s.length) && !isNaN(s.width))
    .map((s) => ({
      ...s,
      length: Math.min(INPUT_LIMITS.MAX_STOCK_DIM, Math.max(1, s.length)),
      width: Math.min(INPUT_LIMITS.MAX_STOCK_DIM, Math.max(1, s.width)),
    }));

  const validPieces = (requiredPieces || [])
    .filter((p) => p && p.length > 0 && p.width > 0 && p.quantity > 0 && !isNaN(p.length) && !isNaN(p.width))
    .filter((p) => p.length <= INPUT_LIMITS.MAX_PIECE_DIM && p.width <= INPUT_LIMITS.MAX_PIECE_DIM && p.quantity <= INPUT_LIMITS.MAX_QUANTITY_PER_PIECE)
    .map((p) => ({
      ...p,
      allowRotation: p.allowRotation !== false,
    }));

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

  // Pre-Flight Safety Guard: Ước tính nhanh số lượng mảnh con trước khi tính toán nặng
  let estimatedSubpieces = 0;
  const maxSL = Math.max(...validStock.map((s) => Math.max(s.length, s.width)));
  const minSW = Math.max(...validStock.map((s) => Math.min(s.length, s.width)));

  if (maxSL > 0 && minSW > 0) {
    for (const p of validPieces) {
      const nl = Math.max(1, Math.ceil(p.length / maxSL));
      const nw = Math.max(1, Math.ceil(p.width / minSW));
      estimatedSubpieces += nl * nw * p.quantity;
    }
  }

  if (estimatedSubpieces > INPUT_LIMITS.MAX_TOTAL_SUBPIECES) {
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

  // 2. Chạy Multi-Heuristic Ensemble kết hợp GRASP tìm phương án tối ưu nhất
  const isLargeOrder = flatCutItems.length > 40;

  const sortStrategies: SortStrategy[] = isLargeOrder
    ? ["AREA_DESC", "MAX_DIM_DESC", "COMBINED_PRIORITY_DESC", "PERIMETER_DESC"]
    : [
        "AREA_DESC",
        "MAX_DIM_DESC",
        "MIN_DIM_DESC",
        "PERIMETER_DESC",
        "COMBINED_PRIORITY_DESC",
        "SIDE_RATIO_DESC",
        "WIDTH_DESC",
        "LENGTH_DESC",
        "ASPECT_RATIO_DESC",
      ];
  const fitRules: FitRule[] = isLargeOrder ? ["BSSF", "BPCF"] : ["BSSF", "BLSF", "BAF", "BPCF"];
  const splitRules: SplitRule[] = isLargeOrder ? ["MINAS", "SAS", "MAXAS"] : ["SAS", "LAS", "MINAS", "MAXAS", "SLAS", "LLAS"];
  const allocations: SheetAllocationMode[] = ["GLOBAL_BEST_FIT", "SHEET_BY_SHEET"];

  let bestSheets: StockSheetState[] | null = null;
  let bestScore = Number.MAX_VALUE;

  const ensembleStartTime = performance.now();
  const maxEnsembleTimeMs = isLargeOrder ? 35 : 120;

  // 2.1. Deterministic Ensemble Pass (Đầy đủ các chiến lược kết hợp)
  ensembleLoop:
  for (const allocation of allocations) {
    for (const sort of sortStrategies) {
      for (const fit of fitRules) {
        for (const split of splitRules) {
          if (performance.now() - ensembleStartTime > maxEnsembleTimeMs && bestSheets !== null) {
            break ensembleLoop;
          }

          const candidateSheets = packCandidate(
            flatCutItems,
            validStock,
            config,
            { sort, fit, split, allocation },
            colorMap
          );

          const score = evaluateCandidateScore(candidateSheets);
          if (score < bestScore || bestSheets === null) {
            bestScore = score;
            bestSheets = candidateSheets;
          }
        }
      }
    }
  }

  // 2.2. Adaptive GRASP & 2-Opt Local Search (với Time Guard < 12ms)
  if (flatCutItems.length >= 3) {
    const graspStartTime = performance.now();
    let seed = 2026;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    let iterations = 0;
    const maxIterations = 160;

    while (performance.now() - graspStartTime < 12 && iterations < maxIterations) {
      iterations++;

      const baseSort = sortStrategies[iterations % sortStrategies.length];
      const baseSorted = sortItems(flatCutItems, baseSort);

      const permuted = [...baseSorted];
      const numSwaps = 1 + (iterations % 3);
      for (let s = 0; s < numSwaps; s++) {
        const i1 = Math.floor(rand() * permuted.length);
        const i2 = Math.floor(rand() * permuted.length);
        if (i1 !== i2) {
          const tmp = permuted[i1];
          permuted[i1] = permuted[i2];
          permuted[i2] = tmp;
        }
      }

      const fit = fitRules[Math.floor(rand() * fitRules.length)];
      const split = splitRules[Math.floor(rand() * splitRules.length)];
      const allocation = allocations[Math.floor(rand() * allocations.length)];

      const candidateSheets = packCandidate(
        permuted,
        validStock,
        config,
        { sort: "NONE", fit, split, allocation },
        colorMap
      );

      const score = evaluateCandidateScore(candidateSheets);
      if (score < bestScore) {
        bestScore = score;
        bestSheets = candidateSheets;
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

