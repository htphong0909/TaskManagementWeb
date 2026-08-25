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
import { packCandidate, calculateWoodCut } from "../woodCuttingOptimizer";


const DEFAULT_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};

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

interface SingleSheetFitResult {
  feasible: boolean;
  stockType: StockSheetInput;
  placedPieces: PlacedPiece[];
}

function tryFitSingleSheetGuillotine(
  pieceIndices: number[],
  items: (RequiredPieceInput | SubPiece)[],
  stock: StockSheetInput,
  kerf: number
): PlacedPiece[] | null {
  const subItems = pieceIndices.map((idx) => items[idx]);

  // Bước 1: Thử nghiệm nhanh qua các bộ Multi-Heuristic
  const sortVariants: ("AREA_DESC" | "MAX_DIM_DESC" | "PERIMETER_DESC" | "WIDTH_DESC")[] = [
    "AREA_DESC",
    "MAX_DIM_DESC",
    "PERIMETER_DESC",
    "WIDTH_DESC",
  ];
  const fitRules: ("BSSF" | "BLSF" | "BAF")[] = ["BSSF", "BLSF", "BAF"];
  const splitRules: ("SAS" | "LAS")[] = ["SAS", "LAS"];

  for (const s of sortVariants) {
    for (const f of fitRules) {
      for (const sp of splitRules) {
        const simSheets = packCandidate(
          subItems,
          [stock],
          { kerf, minSubPieceSize: 50 },
          { sort: s, fit: f, split: sp },
          new Map()
        );
        if (simSheets.length === 1 && simSheets[0].placedPieces.length === subItems.length) {
          return simSheets[0].placedPieces.map((p) => ({ ...p }));
        }
      }
    }
  }

  // Bước 2: Backtracking tìm kiếm chính xác nếu Heuristic chưa tìm ra
  const unplacedMask = (1 << pieceIndices.length) - 1;
  const placed: PlacedPiece[] = [];
  const initialRect: FreeRectangle = { x: 0, y: 0, width: stock.length, height: stock.width };
  const freeRects: FreeRectangle[] = [initialRect];

  function search(remMask: number): boolean {
    if (remMask === 0) {
      return true;
    }

    // Chọn chi tiết chưa xếp
    for (let i = 0; i < pieceIndices.length; i++) {
      if ((remMask & (1 << i)) === 0) continue;

      const itemIdx = pieceIndices[i];
      const item = items[itemIdx];
      const isSub = Boolean("parentId" in item && item.id.startsWith("sub-"));
      const itemName = "parentName" in item
        ? isSub
          ? `${item.parentName} (Tấm con)`
          : item.parentName
        : (item as RequiredPieceInput).name;
      const orientMode = item.orientation || (item.allowRotation === false ? "vertical" : "auto");

      const orientations: { w: number; h: number; rotated: boolean }[] = [];
      if (orientMode === "vertical") {
        orientations.push({ w: item.length, h: item.width, rotated: false });
      } else if (orientMode === "horizontal") {
        orientations.push({ w: item.width, h: item.length, rotated: true });
      } else {
        orientations.push({ w: item.length, h: item.width, rotated: false });
        if (item.length !== item.width) {
          orientations.push({ w: item.width, h: item.length, rotated: true });
        }
      }

      for (let rIdx = 0; rIdx < freeRects.length; rIdx++) {
        const rect = freeRects[rIdx];

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

              const newSplits = splitRect(rect, orient.w, orient.h, kerf, hFirst);

              placed.push(placedPiece);
              const remRect = freeRects.splice(rIdx, 1)[0];
              freeRects.push(...newSplits);

              if (search(remMask ^ (1 << i))) {
                return true;
              }

              placed.pop();
              freeRects.splice(freeRects.length - newSplits.length, newSplits.length);
              freeRects.splice(rIdx, 0, remRect);
            }
          }
        }
      }

      // Chỉ cần thử đặt 1 nhánh cho item đầu tiên tìm được để tránh hoán vị đối xứng
      break;
    }

    return false;
  }

  if (search(unplacedMask)) {
    return placed.map((p) => ({ ...p }));
  }
  return null;
}


export function solveGroundTruthDP(
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
    .map((p) => ({
      ...p,
      orientation: p.orientation || (p.allowRotation === false ? "vertical" : "auto"),
      allowRotation: p.orientation ? p.orientation === "auto" : p.allowRotation !== false,
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

  const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(
    validPieces,
    validStock,
    config
  );

  const N = flatCutItems.length;
  if (N === 0) {
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

  const MAX_DP_ITEMS = 12;
  if (N > MAX_DP_ITEMS) {
    return calculateWoodCut(stockSheets, requiredPieces, customConfig);
  }

  const totalStates = 1 << N;
  const itemAreas = flatCutItems.map((it) => it.length * it.width);
  const maskAreas = new Float64Array(totalStates);

  for (let mask = 1; mask < totalStates; mask++) {
    const lsb = mask & -mask;
    const lsbIdx = 31 - Math.clz32(lsb);
    maskAreas[mask] = maskAreas[mask ^ lsb] + itemAreas[lsbIdx];
  }

  // Giai đoạn 1: Memoize Single-Sheet Feasibility
  const singleSheetFit = new Array<SingleSheetFitResult | null>(totalStates).fill(null);
  singleSheetFit[0] = { feasible: true, stockType: validStock[0], placedPieces: [] };

  const maxStockArea = Math.max(...validStock.map((s) => s.length * s.width));

  for (let mask = 1; mask < totalStates; mask++) {
    if (maskAreas[mask] > maxStockArea) {
      continue;
    }

    const pieceIndices: number[] = [];
    for (let i = 0; i < N; i++) {
      if ((mask & (1 << i)) !== 0) {
        pieceIndices.push(i);
      }
    }

    for (const stock of validStock) {
      if (maskAreas[mask] > stock.length * stock.width) continue;

      const placed = tryFitSingleSheetGuillotine(
        pieceIndices,
        flatCutItems,
        stock,
        config.kerf
      );

      if (placed !== null) {
        singleSheetFit[mask] = {
          feasible: true,
          stockType: stock,
          placedPieces: placed,
        };
        break;
      }
    }
  }

  // Giai đoạn 2: Submask DP O(3^N)
  const dp = new Int32Array(totalStates).fill(1e9);
  const parentSubmask = new Int32Array(totalStates).fill(0);
  dp[0] = 0;

  for (let mask = 1; mask < totalStates; mask++) {
    // Nếu toàn bộ mask vừa 1 tấm ván
    if (singleSheetFit[mask]?.feasible) {
      dp[mask] = 1;
      parentSubmask[mask] = mask;
      continue;
    }

    // Duyệt qua tất cả các submask của mask
    let sub = (mask - 1) & mask;
    while (sub > 0) {
      if (singleSheetFit[sub]?.feasible) {
        const cost = 1 + dp[mask ^ sub];
        if (cost < dp[mask]) {
          dp[mask] = cost;
          parentSubmask[mask] = sub;
        }
      }
      sub = (sub - 1) & mask;
    }
  }

  // Giai đoạn 3: Phục hồi nghiệm (Reconstruction)
  const placedSheets: PlacedStockSheet[] = [];
  let curMask = totalStates - 1;
  let sheetIdx = 1;

  let totalStockArea = 0;
  let totalUsedArea = 0;
  let totalCuts = 0;
  const sheetBreakdown: { [key: string]: number } = {};

  while (curMask > 0) {
    const sub = parentSubmask[curMask] || curMask;
    const fitInfo = singleSheetFit[sub] || {
      feasible: true,
      stockType: validStock[0],
      placedPieces: [],
    };

    const stock = fitInfo.stockType;
    const sKey = `${stock.length}x${stock.width}`;
    sheetBreakdown[sKey] = (sheetBreakdown[sKey] || 0) + 1;

    const sArea = (stock.length * stock.width) / 1_000_000;
    const uArea = fitInfo.placedPieces.reduce(
      (acc, p) => acc + (p.length * p.width) / 1_000_000,
      0
    );
    const wasteArea = Math.max(0, sArea - uArea);
    const efficiency = sArea > 0 ? (uArea / sArea) * 100 : 0;
    const cutsCount = fitInfo.placedPieces.length * 2;

    totalStockArea += sArea;
    totalUsedArea += uArea;
    totalCuts += cutsCount;

    placedSheets.push({
      sheetIndex: sheetIdx++,
      stockType: stock,
      length: stock.length,
      width: stock.width,
      placedPieces: fitInfo.placedPieces,
      usedArea: parseFloat(uArea.toFixed(3)),
      wasteArea: parseFloat(wasteArea.toFixed(3)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      cutsCount,
    });

    curMask = curMask ^ sub;
  }

  // Map stockSheetIndex, stockSheetName, và rotated cho từng SubPiece trong joinedDiagrams
  const pieceSheetMap = new Map<string, { sheetIndex: number; sheetName: string; rotated: boolean }>();
  placedSheets.forEach((sheet) => {
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

  return {
    stockSheetsUsed: placedSheets,
    joinedPieces: joinedDiagrams,
    summary: {
      totalStockSheets: placedSheets.length,
      sheetBreakdown,
      totalRequiredArea: parseFloat(totalRequiredArea.toFixed(3)),
      totalStockArea: parseFloat(totalStockArea.toFixed(3)),
      totalUsedArea: parseFloat(totalUsedArea.toFixed(3)),
      totalWasteArea: parseFloat(totalWasteArea.toFixed(3)),
      efficiencyPercent: parseFloat(efficiencyPercent.toFixed(1)),
      totalCutsCount: totalCuts,
      totalSeamsCount: joinedDiagrams.reduce((acc, d) => acc + d.seamCount, 0),
    },
  };
}
