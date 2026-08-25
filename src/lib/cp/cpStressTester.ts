import { generateRandomTestCase, TestCase, GeneratorOptions } from "./testGenerator";
import { solveGroundTruth } from "./groundTruthOptimizer";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { CalculationResult } from "@/types/woodCut";

export interface TestCaseDiff {
  testId: number;
  piecesCount: number;
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

export interface StressBenchmarkReport {
  totalCases: number;
  optimalMatches: number;
  optimalMatchRate: number; // % (0-100)
  avgSheetGap: number;
  maxSheetGap: number;
  avgWasteGapPercent: number; // %
  maxCompetitiveRatio: number;
  gtTotalTimeMs: number;
  heuristicTotalTimeMs: number;
  avgGtTimeMs: number;
  avgHeuristicTimeMs: number;
  speedupFactor: number;
  diffs: TestCaseDiff[];
}

export interface BenchmarkOptions extends Partial<GeneratorOptions> {
  startSeed?: number;
  onProgress?: (current: number, total: number) => void;
}

export function runStressBenchmark(
  testCount: number,
  options?: BenchmarkOptions
): StressBenchmarkReport {
  const startSeed = options?.startSeed ?? 1000;
  const diffs: TestCaseDiff[] = [];

  let optimalMatches = 0;
  let totalSheetGap = 0;
  let maxSheetGap = 0;
  let totalWasteGapPercent = 0;
  let maxCompetitiveRatio = 1.0;
  let gtTotalTimeMs = 0;
  let heuristicTotalTimeMs = 0;

  for (let i = 0; i < testCount; i++) {
    const seed = startSeed + i;
    const testCase = generateRandomTestCase(seed, options);

    // 1. Chạy Ground Truth (GT)
    const t0 = performance.now();
    const gtResult: CalculationResult = solveGroundTruth(
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

    if (sheetGap > 0) {
      diffs.push({
        testId: seed,
        piecesCount: testCase.pieces.length,
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
          allowRotation: p.allowRotation !== false,
        })),
      });
    }

    if (options?.onProgress && (i + 1) % 100 === 0) {
      options.onProgress(i + 1, testCount);
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
    speedupFactor: parseFloat(speedupFactor.toFixed(2)),
    diffs,
  };
}
