import { describe, it, expect } from "vitest";
import { runStressBenchmark } from "../lib/cp/cpStressTester";

describe("CP Stress Testing Suite", () => {
  it("validates heuristic achieves >= 95% optimal match against Ground Truth on 200 diverse cases", () => {
    const report = runStressBenchmark(200, {
      minPieces: 2,
      maxPieces: 4,
      startSeed: 2026,
    });

    expect(report.totalCases).toBe(200);
    expect(report.optimalMatchRate).toBeGreaterThanOrEqual(95);
    expect(report.avgSheetGap).toBeLessThanOrEqual(0.05);
    expect(report.maxCompetitiveRatio).toBeLessThanOrEqual(1.5);
  });
});
