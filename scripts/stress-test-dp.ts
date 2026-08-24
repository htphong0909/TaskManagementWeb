import { runDPStressBenchmark, DPTestCaseDiff } from "../src/lib/cp/dpStressTester";

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 50;
  let minPieces = 9;
  let maxPieces = 11;
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

  console.log("\n" + "=".repeat(72));
  console.log("   ⚡ WOOD-CUT DP BITMASK GROUND TRUTH STRESS TEST RUNNER (0.5s-1s) ⚡");
  console.log("=".repeat(72));
  console.log(`  Target Tests        : ${count} heavy test cases`);
  console.log(`  Pieces Range        : ${minPieces} - ${maxPieces} pieces / test (Random Stock & Dimensions)`);
  console.log(`  Random Seed Start   : ${startSeed}`);
  console.log(`  Ground Truth Solver : Exact DP Bitmask O(3^N) Submask DP (100% Optimal)`);
  console.log(`  Heuristic Solver    : Multi-Heuristic Ensemble (6 Sorters x 3 Fit x 2 Split)`);
  console.log("-".repeat(72));
  console.log("  Running benchmark...\n");

  const startTime = Date.now();
  const report = runDPStressBenchmark(count, {
    minPieces,
    maxPieces,
    startSeed,
    onCaseComplete: (idx, total, diff: DPTestCaseDiff) => {
      const padIdx = String(idx).padStart(2, "0");
      const padTot = String(total).padStart(2, "0");
      const status = diff.sheetGap === 0 ? "✅ MATCH" : `⚠️ GAP (+${diff.sheetGap})`;
      const gtTimeSec = (diff.gtTimeMs / 1000).toFixed(2);
      console.log(
        `  [#${padIdx}/${padTot}] Seed ${diff.testId} (${diff.piecesCount} pcs, ${diff.stockDimension}): GT=${diff.gtSheets}s (${gtTimeSec}s) | Heur=${diff.heuristicSheets}s (${diff.heuristicTimeMs}ms) -> ${status}`
      );
    },
  });
  const totalWallTime = Date.now() - startTime;

  console.log("\n" + "=".repeat(72));
  console.log("                  🏆 FINAL DP BITMASK BENCHMARK REPORT 🏆");
  console.log("=".repeat(72));
  console.log(`  Total Test Cases Tested   : ${report.totalCases}`);
  console.log(`  Optimal Matches (100% GT) : ${report.optimalMatches} / ${report.totalCases}`);
  console.log(`  Optimal Match Rate        : ${report.optimalMatchRate.toFixed(2)} %`);
  console.log(`  Average Sheet Gap         : ${report.avgSheetGap.toFixed(4)} sheets`);
  console.log(`  Max Sheet Gap             : ${report.maxSheetGap} sheets`);
  console.log(`  Average Waste Area Gap    : ${report.avgWasteGapPercent.toFixed(2)} %`);
  console.log(`  Worst-case Competitive    : ${report.maxCompetitiveRatio.toFixed(3)}x`);
  console.log("-".repeat(72));
  console.log(`  Ground Truth Execution    : ${(report.gtTotalTimeMs / 1000).toFixed(2)} s (Avg: ${(report.avgGtTimeMs / 1000).toFixed(3)} s/test)`);
  console.log(`  Heuristic Execution       : ${report.heuristicTotalTimeMs.toFixed(1)} ms (Avg: ${report.avgHeuristicTimeMs.toFixed(3)} ms/test)`);
  console.log(`  Heuristic Speedup Factor  : ${report.speedupFactor.toFixed(1)}x faster than DP GT`);
  console.log(`  Total Wall Time           : ${(totalWallTime / 1000).toFixed(2)} s`);
  console.log("=".repeat(72));

  if (report.diffs.length > 0) {
    console.log(`\n  ⚠️  SUB-OPTIMAL CASES SUMMARY (${report.diffs.length} / ${report.totalCases} cases):`);
    report.diffs.forEach((d, idx) => {
      console.log(`  #${idx + 1} Test #${d.testId} (${d.piecesCount} pcs on ${d.stockDimension}): GT=${d.gtSheets} sheets vs Heur=${d.heuristicSheets} sheets (Gap: +${d.sheetGap}, Waste Gap: +${d.wasteGap} m2)`);
      console.log(`     Pieces: ${d.pieces.map((p) => `${p.length}x${p.width}${p.allowRotation ? "" : "(!r)"}`).join(", ")}`);
    });
    console.log();
  } else {
    console.log("\n  ✨ PERFECT SCORE: Multi-Heuristic reached mathematical optimum on all heavy tests!\n");
  }
}

main();
