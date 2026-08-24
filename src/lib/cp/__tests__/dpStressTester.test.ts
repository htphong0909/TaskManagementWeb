import { describe, it, expect } from "vitest";
import { generateHeavyTestCase } from "../heavyTestGenerator";
import { runDPStressBenchmark } from "../dpStressTester";

describe("Heavy Generator & DP Stress Tester", () => {
  it("generates random testcases with completely randomized dimensions and rotation", () => {
    const tc = generateHeavyTestCase(12345, { minPieces: 8, maxPieces: 10 });
    expect(tc.pieces.length).toBeGreaterThanOrEqual(8);
    expect(tc.pieces.length).toBeLessThanOrEqual(10);
    expect(tc.stockSheets[0].length).toBeGreaterThanOrEqual(800);
    expect(tc.pieces.every((p) => p.length > 0 && p.width > 0)).toBe(true);
  });

  it("runs a 5-test DP benchmark successfully", () => {
    const report = runDPStressBenchmark(5, { minPieces: 6, maxPieces: 8, startSeed: 777 });
    expect(report.totalCases).toBe(5);
    expect(report.optimalMatchRate).toBeGreaterThanOrEqual(80);
    expect(report.avgGtTimeMs).toBeGreaterThan(0);
    expect(report.avgHeuristicTimeMs).toBeGreaterThan(0);
  });
});
