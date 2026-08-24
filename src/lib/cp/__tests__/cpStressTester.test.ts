import { describe, it, expect } from "vitest";
import { generateRandomTestCase } from "../testGenerator";
import { runStressBenchmark } from "../cpStressTester";

describe("CP Stress Tester & Fuzzer", () => {
  it("generates valid testcases within constraints", () => {
    const tc = generateRandomTestCase(42, { minPieces: 3, maxPieces: 5 });
    expect(tc.pieces.length).toBeGreaterThanOrEqual(3);
    expect(tc.pieces.length).toBeLessThanOrEqual(5);
    expect(tc.stockSheets.length).toBeGreaterThan(0);
    expect(tc.pieces.every((p) => p.length > 0 && p.width > 0)).toBe(true);
  });

  it("runs a 50-test stress benchmark and achieves >= 95% optimal match rate", () => {
    const report = runStressBenchmark(50, { minPieces: 2, maxPieces: 4 });
    expect(report.totalCases).toBe(50);
    expect(report.optimalMatchRate).toBeGreaterThanOrEqual(95);
    expect(report.avgSheetGap).toBeLessThanOrEqual(0.05);
    expect(report.speedupFactor).toBeGreaterThan(0);
  });
});
