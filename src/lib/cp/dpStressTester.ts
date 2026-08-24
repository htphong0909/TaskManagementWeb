import { generateHeavyTestCase, HeavyGeneratorOptions } from "./heavyTestGenerator";
import { solveGroundTruthDP } from "./dpGroundTruthOptimizer";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { CalculationResult } from "@/types/woodCut";

export interface DPTestCaseDiff {
  testId: number;
  piecesCount: number;
  stockDimension: string;
  gtSheets: number;
  heuristicSheets: number;
  sheetGap: number;
  gtWasteArea: number;
  heuristicWasteArea: number;
  wasteGap: number;
  competitiveRatio: number;
  gtTimeMs: number;
  heuristicTimeMs: number;
  pieces: { length: number; width: number; allowRotation: boolean }[];
}

export interface DPBenchmarkReport {
  totalCases: number;
  optimalMatches: number;
  optimalMatchRate: number;
  avgSheetGap: number;
  maxSheetGap: number;
  avgWasteGapPercent: number;
  maxCompetitiveRatio: number;
  gtTotalTimeMs: number;
  heuristicTotalTimeMs: number;
  avgGtTimeMs: number;
  avgHeuristicTimeMs: number;
  speedupFactor: number;
  diffs: DPTestCaseDiff[];
}

export interface DPBenchmarkOptions extends Partial<HeavyGeneratorOptions> {
  startSeed?: number;
  onCaseComplete?: (index: number, total: number, diff: DPTestCaseDiff) => void;
}

export function runDPStressBenchmark(
  testCount: number,
  options?: DPBenchmarkOptions
): DPBenchmarkReport {
  const startSeed = options?.startSeed ?? 5000;
  const diffs: DPTestCaseDiff[] = [];

  let optimalMatches = 0;
  let totalSheetGap = 0;
  let maxSheetGap = 0;
  let totalWasteGapPercent = 0;
  let maxCompetitiveRatio = 1.0;
  let gtTotalTimeMs = 0;
  let heuristicTotalTimeMs = 0;

  for (let i = 0; i < testCount; i++) {
    const seed = startSeed + i;
    const testCase = generateHeavyTestCase(seed, options);

    // 1. Chạy DP Ground Truth
    const t0 = performance.now();
    const gtResult: CalculationResult = solveGroundTruthDP(
      testCase.stockSheets,
      testCase.pieces,
      testCase.config
    );
    const t1 = performance.now();
    const gtTime = t1 - t0;
    gtTotalTimeMs += gtTime;

    // 2. Chạy Heuristic Optimizer
    const t2 = performance.now();
    const heurResult: CalculationResult = calculateWoodCut(
      testCase.stockSheets,
      testCase.pieces,
      testCase.config
    );
    const t3 = performance.now();
    const heurTime = t3 - t2;
    heuristicTotalTimeMs += heurTime;

    const gtSheets = gtResult.stockSheetsUsed.length;
    const heurSheets = heurResult.stockSheetsUsed.length;
    const sheetGap = heurSheets - gtSheets;
    const compRatio = gtSheets > 0 ? heurSheets / gtSheets : 1.0;

    if (sheetGap <= 0) {
      optimalMatches++;
    }

    if (sheetGap > maxSheetGap) {
      maxSheetGap = sheetGap;
    }

    if (compRatio > maxCompetitiveRatio) {
      maxCompetitiveRatio = compRatio;
    }

    totalSheetGap += Math.max(0, sheetGap);

    const gtWaste = gtResult.summary.totalWasteArea;
    const heurWaste = heurResult.summary.totalWasteArea;
    const totalReqArea = gtResult.summary.totalRequiredArea || 1;
    const wasteGapPct = ((heurWaste - gtWaste) / totalReqArea) * 100;
    totalWasteGapPercent += Math.max(0, wasteGapPct);

    const stock = testCase.stockSheets[0];
    const caseDiff: DPTestCaseDiff = {
      testId: seed,
      piecesCount: testCase.pieces.length,
      stockDimension: `${stock.length}x${stock.width}`,
      gtSheets,
      heuristicSheets: heurSheets,
      sheetGap,
      gtWasteArea: gtWaste,
      heuristicWasteArea: heurWaste,
      wasteGap: parseFloat((heurWaste - gtWaste).toFixed(3)),
      competitiveRatio: parseFloat(compRatio.toFixed(3)),
      gtTimeMs: parseFloat(gtTime.toFixed(2)),
      heuristicTimeMs: parseFloat(heurTime.toFixed(2)),
      pieces: testCase.pieces.map((p) => ({
        length: p.length,
        width: p.width,
        allowRotation: p.allowRotation,
      })),
    };

    if (sheetGap > 0) {
      diffs.push(caseDiff);
    }

    if (options?.onCaseComplete) {
      options.onCaseComplete(i + 1, testCount, caseDiff);
    }
  }

  const optimalMatchRate = (optimalMatches / testCount) * 100;
  const avgSheetGap = totalSheetGap / testCount;
  const avgWasteGapPercent = totalWasteGapPercent / testCount;
  const avgGtTimeMs = gtTotalTimeMs / testCount;
  const avgHeuristicTimeMs = heuristicTotalTimeMs / testCount;
  const speedupFactor =
    heuristicTotalTimeMs > 0 ? gtTotalTimeMs / heuristicTotalTimeMs : 1.0;

  return {
    totalCases: testCount,
    optimalMatches,
    optimalMatchRate: parseFloat(optimalMatchRate.toFixed(2)),
    avgSheetGap: parseFloat(avgSheetGap.toFixed(4)),
    maxSheetGap,
    avgWasteGapPercent: parseFloat(avgWasteGapPercent.toFixed(2)),
    maxCompetitiveRatio: parseFloat(maxCompetitiveRatio.toFixed(3)),
    gtTotalTimeMs: parseFloat(gtTotalTimeMs.toFixed(2)),
    heuristicTotalTimeMs: parseFloat(heuristicTotalTimeMs.toFixed(2)),
    avgGtTimeMs: parseFloat(avgGtTimeMs.toFixed(3)),
    avgHeuristicTimeMs: parseFloat(avgHeuristicTimeMs.toFixed(3)),
    speedupFactor: parseFloat(speedupFactor.toFixed(1)),
    diffs,
  };
}
