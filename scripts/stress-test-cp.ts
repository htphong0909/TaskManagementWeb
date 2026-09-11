import { runStressBenchmark } from "../src/lib/cp/cpStressTester";

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 1000;
  const minPieces = 2;
  let maxPieces = 4;
  let startSeed = 1000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" || args[i] === "-n") {
      count = parseInt(args[i + 1], 10) || 1000;
      i++;
    } else if (args[i] === "--max-pieces" || args[i] === "-m") {
      maxPieces = parseInt(args[i + 1], 10) || 4;
      i++;
    } else if (args[i] === "--seed" || args[i] === "-s") {
      startSeed = parseInt(args[i + 1], 10) || 1000;
      i++;
    }
  }

  return { count, minPieces, maxPieces, startSeed };
}

function main() {
  const { count, minPieces, maxPieces, startSeed } = parseArgs();

  console.log("\n" + "=".repeat(66));
  console.log("   ⚡ WOOD-CUT COMPETITIVE PROGRAMMING STRESS TEST RUNNER ⚡");
  console.log("=".repeat(66));
  console.log(`  Target Tests        : ${count.toLocaleString()} test cases`);
  console.log(`  Pieces Range        : ${minPieces} - ${maxPieces} pieces / test`);
  console.log(`  Random Seed Start   : ${startSeed}`);
  console.log(`  Ground Truth Solver : Exact Branch-and-Bound Backtracking (100% Optimal)`);
  console.log(`  Heuristic Solver    : Multi-Heuristic Ensemble (6 Sorters x 3 Fit x 2 Split)`);
  console.log("-".repeat(66));
  console.log("  Running benchmark...\n");

  const startTime = Date.now();
  const report = runStressBenchmark(count, {
    minPieces,
    maxPieces,
    startSeed,
    onProgress: (cur, tot) => {
      const pct = Math.round((cur / tot) * 100);
      process.stdout.write(`\r  Progress: [${cur}/${tot}] (${pct}%)`);
    },
  });
  const totalWallTime = Date.now() - startTime;

  console.log("\r" + " ".repeat(50) + "\r");
  console.log("=".repeat(66));
  console.log("                  🏆 FINAL CP BENCHMARK REPORT 🏆");
  console.log("=".repeat(66));
  console.log(`  Total Test Cases Tested   : ${report.totalCases.toLocaleString()}`);
  console.log(`  Optimal Matches (100% GT) : ${report.optimalMatches.toLocaleString()} / ${report.totalCases.toLocaleString()}`);
  console.log(`  Optimal Match Rate        : ${report.optimalMatchRate.toFixed(2)} %`);
  console.log(`  Average Sheet Gap         : ${report.avgSheetGap.toFixed(4)} sheets`);
  console.log(`  Max Sheet Gap             : ${report.maxSheetGap} sheets`);
  console.log(`  Average Waste Area Gap    : ${report.avgWasteGapPercent.toFixed(2)} %`);
  console.log(`  Worst-case Competitive    : ${report.maxCompetitiveRatio.toFixed(3)}x`);
  console.log("-".repeat(66));
  console.log(`  Ground Truth Execution    : ${report.gtTotalTimeMs.toFixed(1)} ms (${report.avgGtTimeMs.toFixed(3)} ms/test)`);
  console.log(`  Heuristic Execution       : ${report.heuristicTotalTimeMs.toFixed(1)} ms (${report.avgHeuristicTimeMs.toFixed(3)} ms/test)`);
  console.log(`  Heuristic Speedup         : ${report.speedupFactor.toFixed(1)}x faster`);
  console.log(`  Total Wall Time           : ${(totalWallTime / 1000).toFixed(2)} s`);
  console.log("=".repeat(66));

  if (report.diffs.length > 0) {
    console.log(`\n  ⚠️  SUB-OPTIMAL CASES SAMPLE (${Math.min(5, report.diffs.length)} / ${report.diffs.length} cases):`);
    report.diffs.slice(0, 5).forEach((d, idx) => {
      console.log(`  #${idx + 1} Test #${d.testId} (${d.piecesCount} pcs): GT=${d.gtSheets} sheets vs Heur=${d.heuristicSheets} sheets (Gap: +${d.sheetGap})`);
      console.log(`     Pieces: ${d.pieces.map((p) => `${p.length}x${p.width}${p.allowRotation ? "" : "(!r)"}`).join(", ")}`);
    });
    console.log();
  } else {
    console.log("\n  ✨ PERFECT SCORE: Heuristic found the mathematical optimum on ALL test cases!\n");
  }
}

main();
