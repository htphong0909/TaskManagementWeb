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
  gtCuts: number;
  heuristicCuts: number;
  cutsGap: number;
  gtEfficiency: number;
  heuristicEfficiency: number;
  efficiencyGap: number;
  totalRequiredArea: number;
  gtStockArea: number;
  heuristicStockArea: number;
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
  avgGtCuts: number;
  avgHeuristicCuts: number;
  avgCutsGap: number;
  avgGtEfficiency: number;
  avgHeuristicEfficiency: number;
  gtTotalTimeMs: number;
  heuristicTotalTimeMs: number;
  avgGtTimeMs: number;
  avgHeuristicTimeMs: number;
  speedupFactor: number;
  diffs: DPTestCaseDiff[];
  topGapCases: DPTestCaseDiff[];
}

export interface DPBenchmarkOptions extends Partial<HeavyGeneratorOptions> {
  startSeed?: number;
  onCaseComplete?: (index: number, total: number, diff: DPTestCaseDiff) => void;
}

export function runDPStressBenchmark(
  testCount: number,
  options?: DPBenchmarkOptions
): DPBenchmarkReport {
  const startSeed = options?.startSeed ?? 2026;
  const allCases: DPTestCaseDiff[] = [];
  const diffs: DPTestCaseDiff[] = [];

  let optimalMatches = 0;
  let totalSheetGap = 0;
  let maxSheetGap = 0;
  let totalWasteGapPercent = 0;
  let maxCompetitiveRatio = 1.0;
  let totalGtCuts = 0;
  let totalHeuristicCuts = 0;
  let totalGtEfficiency = 0;
  let totalHeuristicEfficiency = 0;
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

    const gtCuts = gtResult.summary.totalCutsCount;
    const heurCuts = heurResult.summary.totalCutsCount;
    totalGtCuts += gtCuts;
    totalHeuristicCuts += heurCuts;

    const gtEff = gtResult.summary.efficiencyPercent;
    const heurEff = heurResult.summary.efficiencyPercent;
    totalGtEfficiency += gtEff;
    totalHeuristicEfficiency += heurEff;

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
      gtCuts,
      heuristicCuts: heurCuts,
      cutsGap: heurCuts - gtCuts,
      gtEfficiency: gtEff,
      heuristicEfficiency: heurEff,
      efficiencyGap: parseFloat((heurEff - gtEff).toFixed(1)),
      totalRequiredArea: totalReqArea,
      gtStockArea: gtResult.summary.totalStockArea,
      heuristicStockArea: heurResult.summary.totalStockArea,
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
    };

    allCases.push(caseDiff);

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

  const topGapCases = [...diffs].sort((a, b) => {
    if (b.sheetGap !== a.sheetGap) return b.sheetGap - a.sheetGap;
    return b.wasteGap - a.wasteGap;
  });

  return {
    totalCases: testCount,
    optimalMatches,
    optimalMatchRate: parseFloat(optimalMatchRate.toFixed(2)),
    avgSheetGap: parseFloat(avgSheetGap.toFixed(4)),
    maxSheetGap,
    avgWasteGapPercent: parseFloat(avgWasteGapPercent.toFixed(2)),
    maxCompetitiveRatio: parseFloat(maxCompetitiveRatio.toFixed(3)),
    avgGtCuts: parseFloat((totalGtCuts / testCount).toFixed(1)),
    avgHeuristicCuts: parseFloat((totalHeuristicCuts / testCount).toFixed(1)),
    avgCutsGap: parseFloat(((totalHeuristicCuts - totalGtCuts) / testCount).toFixed(1)),
    avgGtEfficiency: parseFloat((totalGtEfficiency / testCount).toFixed(1)),
    avgHeuristicEfficiency: parseFloat((totalHeuristicEfficiency / testCount).toFixed(1)),
    gtTotalTimeMs: parseFloat(gtTotalTimeMs.toFixed(2)),
    heuristicTotalTimeMs: parseFloat(heuristicTotalTimeMs.toFixed(2)),
    avgGtTimeMs: parseFloat(avgGtTimeMs.toFixed(3)),
    avgHeuristicTimeMs: parseFloat(avgHeuristicTimeMs.toFixed(3)),
    speedupFactor: parseFloat(speedupFactor.toFixed(1)),
    diffs,
    topGapCases,
  };
}

