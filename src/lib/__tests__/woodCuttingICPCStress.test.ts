import { describe, it, expect } from "vitest";
import { generateICPCTestSuite, ICPCTestCase } from "../cp/icpcStressTester";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { validateCuttingPlanIntegrity } from "../woodCuttingValidator";

describe("ICPC-Grade Comprehensive Stress Test Suite (260 Cases across 5 Subtasks)", () => {
  const allCases = generateICPCTestSuite();

  it("Subtask 1: Passes 100% of Corner Cases & Micro Dimensions (10/10)", () => {
    const subtask1 = allCases.filter((tc) => tc.subtask === 1);
    expect(subtask1).toHaveLength(10);

    for (const tc of subtask1) {
      const result = calculateWoodCut(tc.stockSheets, tc.pieces, tc.config);
      const validation = validateCuttingPlanIntegrity(result, tc.stockSheets, tc.pieces, tc.config);

      if (!validation.isValid) {
        console.error(`Subtask 1 Fail on ${tc.id} (${tc.name}):`, validation.errors);
      }
      expect(validation.overlapsCount).toBe(0);
      expect(validation.outOfBoundsCount).toBe(0);
      expect(validation.isValid).toBe(true);
    }
  });

  it("Subtask 2: Passes 100% of Needle & Extreme Aspect Ratio Cases (10/10)", () => {
    const subtask2 = allCases.filter((tc) => tc.subtask === 2);
    expect(subtask2).toHaveLength(10);

    for (const tc of subtask2) {
      const result = calculateWoodCut(tc.stockSheets, tc.pieces, tc.config);
      const validation = validateCuttingPlanIntegrity(result, tc.stockSheets, tc.pieces, tc.config);

      if (!validation.isValid) {
        console.error(`Subtask 2 Fail on ${tc.id} (${tc.name}):`, validation.errors);
      }
      expect(validation.overlapsCount).toBe(0);
      expect(validation.outOfBoundsCount).toBe(0);
      expect(validation.isValid).toBe(true);
    }
  });

  it("Subtask 3: Passes 100% of Massive Panels & Prime Dimensions (20/20) including User Benchmark", () => {
    const subtask3 = allCases.filter((tc) => tc.subtask === 3);
    expect(subtask3).toHaveLength(20);

    for (const tc of subtask3) {
      const result = calculateWoodCut(tc.stockSheets, tc.pieces, tc.config);
      const validation = validateCuttingPlanIntegrity(result, tc.stockSheets, tc.pieces, tc.config);

      if (!validation.isValid) {
        console.error(`Subtask 3 Fail on ${tc.id} (${tc.name}):`, validation.errors);
      }
      expect(validation.overlapsCount).toBe(0);
      expect(validation.outOfBoundsCount).toBe(0);
      expect(validation.isValid).toBe(true);
    }

    // Kiểm tra chi tiết ca kiểm thử của người dùng: 4002x12210 (q=12) trên 2440x1220
    const userCase = subtask3.find((tc) => tc.id === "TC-3.1")!;
    const userResult = calculateWoodCut(userCase.stockSheets, userCase.pieces, userCase.config);
    expect(userResult.joinedPieces).toHaveLength(12);
    expect(userResult.joinedPieces[0].subPieces.length).toBe(22); // 2 x 11 mảnh con
    // Tổng số ván gốc phải tương ứng với 264 mảnh con (trên 100 ván thay vì chỉ 12 ván bị tràn viền như trước)
    expect(userResult.stockSheetsUsed.length).toBeGreaterThanOrEqual(100);
  }, 60000);

  it("Subtask 4: Passes 100% of Grain Orientation Locks & Multi-Stock Mixes (20/20)", () => {
    const subtask4 = allCases.filter((tc) => tc.subtask === 4);
    expect(subtask4).toHaveLength(20);

    for (const tc of subtask4) {
      const result = calculateWoodCut(tc.stockSheets, tc.pieces, tc.config);
      const validation = validateCuttingPlanIntegrity(result, tc.stockSheets, tc.pieces, tc.config);

      if (!validation.isValid) {
        console.error(`Subtask 4 Fail on ${tc.id} (${tc.name}):`, validation.errors);
      }
      expect(validation.overlapsCount).toBe(0);
      expect(validation.outOfBoundsCount).toBe(0);
      expect(validation.orientationViolationsCount).toBe(0);
      expect(validation.isValid).toBe(true);
    }
  });

  it("Subtask 5: Passes 100% of ICPC Seeded Random Stress Fuzzing (200/200)", () => {
    const subtask5 = allCases.filter((tc) => tc.subtask === 5);
    expect(subtask5).toHaveLength(200);

    let passCount = 0;
    for (const tc of subtask5) {
      const result = calculateWoodCut(tc.stockSheets, tc.pieces, tc.config);
      const validation = validateCuttingPlanIntegrity(result, tc.stockSheets, tc.pieces, tc.config);

      if (!validation.isValid) {
        console.error(`Subtask 5 Fail on ${tc.id} (${tc.name}):`, validation.errors);
      }
      expect(validation.overlapsCount).toBe(0);
      expect(validation.outOfBoundsCount).toBe(0);
      expect(validation.orientationViolationsCount).toBe(0);
      expect(validation.isValid).toBe(true);
      passCount++;
    }

    expect(passCount).toBe(200);
  }, 90000);
});
