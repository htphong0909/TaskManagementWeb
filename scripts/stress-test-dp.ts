import { runDPStressBenchmark, DPTestCaseDiff } from "../src/lib/cp/dpStressTester";

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 50;
  let minPieces = 13;
  let maxPieces = 14;
  let startSeed = 2026;


  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" || args[i] === "-n") {
      count = parseInt(args[i + 1], 10) || 50;
      i++;
    } else if (args[i] === "--min-pieces" || args[i] === "-min") {
      minPieces = parseInt(args[i + 1], 10) || 9;
      i++;
    } else if (args[i] === "--max-pieces" || args[i] === "-max") {
      maxPieces = parseInt(args[i + 1], 10) || 11;
      i++;
    } else if (args[i] === "--seed" || args[i] === "-s") {
      startSeed = parseInt(args[i + 1], 10) || 2026;
      i++;
    }
  }

  return { count, minPieces, maxPieces, startSeed };
}

function main() {
  const { count, minPieces, maxPieces, startSeed } = parseArgs();

  console.log("\n" + "=".repeat(78));
  console.log("   ⚡ WOOD-CUT DP BITMASK GROUND TRUTH STRESS TEST RUNNER (0.5s-1s) ⚡");
  console.log("=".repeat(78));
  console.log(`  Target Tests        : ${count} heavy test cases`);
  console.log(`  Pieces Range        : ${minPieces} - ${maxPieces} pieces / test (Random Stock & Dimensions)`);
  console.log(`  Random Seed Start   : ${startSeed}`);
  console.log(`  Ground Truth Solver : Exact DP Bitmask O(3^N) Submask DP (100% Optimal)`);
  console.log(`  Heuristic Solver    : Multi-Heuristic Ensemble (6 Sorters x 3 Fit x 2 Split)`);
  console.log("-".repeat(78));
  console.log("  Running benchmark...\n");

  const startTime = Date.now();
  const report = runDPStressBenchmark(count, {
    minPieces,
    maxPieces,
    startSeed,
    onCaseComplete: (idx, total, diff: DPTestCaseDiff) => {
      const padIdx = String(idx).padStart(2, "0");
      const padTot = String(total).padStart(2, "0");
      const status = diff.sheetGap === 0 ? "✅ MATCH" : `⚠️ GAP (+${diff.sheetGap} sheet)`;
      const gtTimeSec = (diff.gtTimeMs / 1000).toFixed(2);
      console.log(
        `  [#${padIdx}/${padTot}] Seed ${diff.testId} (${diff.piecesCount} pcs on ${diff.stockDimension}): ` +
        `Sheets: GT=${diff.gtSheets} vs Heur=${diff.heuristicSheets} | ` +
        `Cuts: GT=${diff.gtCuts} vs Heur=${diff.heuristicCuts} | ` +
        `Eff: GT=${diff.gtEfficiency.toFixed(1)}% vs Heur=${diff.heuristicEfficiency.toFixed(1)}% | ` +
        `Time: GT=${gtTimeSec}s, Heur=${diff.heuristicTimeMs.toFixed(2)}ms -> ${status}`
      );
    },
  });
  const totalWallTime = Date.now() - startTime;

  console.log("\n" + "=".repeat(78));
  console.log("                  🏆 FINAL DP BITMASK BENCHMARK REPORT 🏆");
  console.log("=".repeat(78));
  console.log(`  Total Test Cases Tested   : ${report.totalCases}`);
  console.log(`  Optimal Matches (100% GT) : ${report.optimalMatches} / ${report.totalCases}`);
  console.log(`  Optimal Match Rate        : ${report.optimalMatchRate.toFixed(2)} %`);
  console.log(`  Average Sheet Gap         : ${report.avgSheetGap.toFixed(4)} sheets`);
  console.log(`  Max Sheet Gap             : ${report.maxSheetGap} sheets`);
  console.log("-".repeat(78));
  console.log(`  Average Cuts Count        : GT = ${report.avgGtCuts} cuts | Heur = ${report.avgHeuristicCuts} cuts (Diff: +${report.avgCutsGap} cuts)`);
  console.log(`  Average Efficiency        : GT = ${report.avgGtEfficiency}% | Heur = ${report.avgHeuristicEfficiency}%`);
  console.log(`  Average Waste Area Gap    : ${report.avgWasteGapPercent.toFixed(2)} %`);
  console.log(`  Worst-case Competitive    : ${report.maxCompetitiveRatio.toFixed(3)}x`);
  console.log("-".repeat(78));
  console.log(`  Ground Truth Execution    : ${(report.gtTotalTimeMs / 1000).toFixed(2)} s (Avg: ${(report.avgGtTimeMs / 1000).toFixed(3)} s/test)`);
  console.log(`  Heuristic Execution       : ${report.heuristicTotalTimeMs.toFixed(1)} ms (Avg: ${report.avgHeuristicTimeMs.toFixed(3)} ms/test)`);
  console.log(`  Heuristic Speedup Factor  : ${report.speedupFactor.toFixed(1)}x faster than DP GT`);
  console.log(`  Total Wall Clock Time     : ${(totalWallTime / 1000).toFixed(2)} s`);
  console.log("=".repeat(78));

  if (report.topGapCases.length > 0) {
    console.log(`\n  🔥 TOP SUB-OPTIMAL TESTCASES WITH LARGEST GAP (${report.topGapCases.length} / ${report.totalCases} cases):`);
    console.log("=".repeat(78));
    report.topGapCases.forEach((d, idx) => {
      console.log(`\n  📌 Case #${idx + 1} | Seed: ${d.testId} (${d.piecesCount} pieces, Stock Sheet: ${d.stockDimension})`);
      console.log(`     - Số tấm sử dụng   : GT = ${d.gtSheets} tấm  vs  Heuristic = ${d.heuristicSheets} tấm (Chênh lệch: +${d.sheetGap} tấm)`);
      console.log(`     - Số đường cưa     : GT = ${d.gtCuts} cuts  vs  Heuristic = ${d.heuristicCuts} cuts (Chênh lệch: +${d.cutsGap} cuts)`);
      console.log(`     - Tỷ lệ hiệu dụng  : GT = ${d.gtEfficiency.toFixed(1)}%  vs  Heuristic = ${d.heuristicEfficiency.toFixed(1)}%`);
      console.log(`     - Diện tích hao phí: GT = ${d.gtWasteArea.toFixed(3)} m2  vs  Heuristic = ${d.heuristicWasteArea.toFixed(3)} m2 (Dư: +${d.wasteGap} m2)`);
      console.log(`     - Thời gian giải   : GT = ${(d.gtTimeMs / 1000).toFixed(2)}s  vs  Heuristic = ${d.heuristicTimeMs.toFixed(2)}ms`);
      console.log(`     - Danh sách chi tiết gỗ:`);
      d.pieces.forEach((p, pIdx) => {
        const rotStr = p.allowRotation ? "Cho phép xoay 🔄" : "Khóa vân gỗ (!r)";
        console.log(`        ${String(pIdx + 1).padStart(2, " ")}. ${p.length} x ${p.width} mm (${rotStr})`);
      });
    });
    console.log("\n" + "=".repeat(78));
  } else {
    console.log("\n  ✨ PERFECT SCORE: Multi-Heuristic reached mathematical optimum on all heavy tests!\n");
  }
}

main();

