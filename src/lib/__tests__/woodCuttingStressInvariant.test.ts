import { describe, it, expect } from "vitest";
import { generateHeavyTestCase } from "../cp/heavyTestGenerator";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { validateCuttingPlanIntegrity } from "../woodCuttingValidator";

describe("Comprehensive Invariant Stress Test (100 Cases)", () => {
  it("guarantees 100% zero overlap, zero out-of-bounds, and valid orientations on 100 heavy random test cases", () => {
    const testCount = 100;
    const startSeed = 8888;
    let validCount = 0;

    for (let i = 0; i < testCount; i++) {
      const tc = generateHeavyTestCase(startSeed + i, { minPieces: 5, maxPieces: 15 });
      const result = calculateWoodCut(tc.stockSheets, tc.pieces, tc.config);

      const validation = validateCuttingPlanIntegrity(result, tc.stockSheets, tc.pieces, tc.config);

      if (!validation.isValid) {
        console.error(`Invariant failure on Seed ${tc.id}:`, validation.errors);
      }

      expect(validation.overlapsCount).toBe(0);
      expect(validation.outOfBoundsCount).toBe(0);
      expect(validation.orientationViolationsCount).toBe(0);
      expect(validation.isValid).toBe(true);

      validCount++;
    }

    expect(validCount).toBe(testCount);
  });
});
