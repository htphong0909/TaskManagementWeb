# Wood-Cut DP Bitmask Ground Truth & Heavy Random Stress Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an exact Ground Truth solver using DP Bitmask ($O(3^N)$ submask DP) for 2D Guillotine Bin Packing with rotation and kerf, build a completely randomized heavy test generator ($N \in [8, 12]$) tuned for $0.5\text{s} - 1.0\text{s}$ per test, and execute a 50-test benchmark with full CP metrics.

**Architecture:**
- `dpGroundTruthOptimizer.ts`: 3-stage exact solver:
  1. Single-sheet Guillotine feasibility memoization (`isValidSingleSheet[mask]` + single-sheet layout).
  2. Submask DP: $DP[mask] = \min_{sub \subseteq mask, sub \in \text{valid}} (1 + DP[mask \setminus sub])$.
  3. Exact layout reconstruction from DP parent masks.
- `heavyTestGenerator.ts`: Generator producing completely random stock sizes, random piece dimensions, random rotation flags per piece, random kerfs, and $N \in [8, 12]$ pieces.
- `dpStressTester.ts` & `scripts/stress-test-dp.ts`: Stress test engine and CLI runner running 50 test cases, tracking live per-test times, and printing a comprehensive CP scoreboard.

**Tech Stack:** TypeScript, Next.js, Vitest, Node.js (`tsx`).

## Global Constraints
- Preserve Guillotine cutting properties and kerf constraints.
- Respect `piece.allowRotation` strictly in all DP state transitions.
- Every task must end with passing tests and a commit.

---

### Task 1: DP Bitmask Ground Truth Solver (`dpGroundTruthOptimizer.ts`)

**Files:**
- Create: `src/lib/cp/dpGroundTruthOptimizer.ts`
- Test: `src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`

**Interfaces:**
- Produces: `solveGroundTruthDP(stockSheets: StockSheetInput[], pieces: RequiredPieceInput[], config?: Partial<CalculationConfig>): CalculationResult`

- [ ] **Step 1: Write unit tests for DP Bitmask Ground Truth solver**

```typescript
// in src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts
import { describe, it, expect } from "vitest";
import { solveGroundTruthDP } from "../dpGroundTruthOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("DP Bitmask Ground Truth Solver", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 1000 }];

  it("finds exact 1-sheet solution for 4 quadrant squares using bitmask DP", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Q1", length: 495, width: 495, quantity: 4, allowRotation: true },
    ];
    const result = solveGroundTruthDP(stock, pieces, { kerf: 10 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(4);
  });

  it("proves 2 sheets minimum for pieces exceeding 1 sheet capacity", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Big1", length: 800, width: 600, quantity: 1, allowRotation: true },
      { id: "p2", name: "Big2", length: 800, width: 600, quantity: 1, allowRotation: true },
    ];
    const result = solveGroundTruthDP(stock, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`
Expected: FAIL (file does not exist yet).

- [ ] **Step 3: Implement `dpGroundTruthOptimizer.ts`**

Implement:
1. `canFitSingleSheet(mask, items, stock, kerf)` with guillotine recursive placement and memoization.
2. Submask DP iterating through all submasks ($O(3^N)$) to find minimal sheet count.
3. Path reconstruction returning full `CalculationResult`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cp/dpGroundTruthOptimizer.ts src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts
git commit -m "feat(cp): implement exact DP Bitmask Ground Truth solver"
```

---

### Task 2: Heavy Random Test Generator & DP Stress Tester

**Files:**
- Create: `src/lib/cp/heavyTestGenerator.ts`
- Create: `src/lib/cp/dpStressTester.ts`
- Test: `src/lib/cp/__tests__/dpStressTester.test.ts`

**Interfaces:**
- Produces:
  - `generateHeavyTestCase(seed: number, options?: Partial<HeavyGeneratorOptions>): TestCase`
  - `runDPStressBenchmark(testCount: number, options?: DPBenchmarkOptions): DPBenchmarkReport`

- [ ] **Step 1: Write test for heavy test generator and DP stress tester**

```typescript
// in src/lib/cp/__tests__/dpStressTester.test.ts
import { describe, it, expect } from "vitest";
import { generateHeavyTestCase } from "../heavyTestGenerator";
import { runDPStressBenchmark } from "../dpStressTester";

describe("Heavy Generator & DP Stress Tester", () => {
  it("generates random testcases with completely randomized dimensions and rotation", () => {
    const tc = generateHeavyTestCase(12345, { minPieces: 8, maxPieces: 10 });
    expect(tc.pieces.length).toBeGreaterThanOrEqual(8);
    expect(tc.pieces.length).toBeLessThanOrEqual(10);
    expect(tc.stockSheets[0].length).toBeGreaterThanOrEqual(800);
  });

  it("runs a 5-test DP benchmark successfully", () => {
    const report = runDPStressBenchmark(5, { minPieces: 6, maxPieces: 8 });
    expect(report.totalCases).toBe(5);
    expect(report.optimalMatchRate).toBeGreaterThanOrEqual(80);
    expect(report.avgGtTimeMs).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cp/__tests__/dpStressTester.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `heavyTestGenerator.ts` and `dpStressTester.ts`**

- `heavyTestGenerator.ts`: Generates fully random stock sizes ($L \in [800, 2440]$, $W \in [400, 1220]$), piece dimensions, random `allowRotation: true/false`, random kerfs ($0, 2, 3, 5$), and $N \in [8, 12]$.
- `dpStressTester.ts`: Runs `solveGroundTruthDP` vs `calculateWoodCut` for each test case, tracking optimal matches, sheet gaps, waste errors, and timings.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cp/__tests__/dpStressTester.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cp/heavyTestGenerator.ts src/lib/cp/dpStressTester.ts src/lib/cp/__tests__/dpStressTester.test.ts
git commit -m "feat(cp): implement heavy random test generator and DP stress tester"
```

---

### Task 3: CLI Runner Script (`scripts/stress-test-dp.ts`) & 50 Heavy Tests Benchmark

**Files:**
- Create: `scripts/stress-test-dp.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: CLI script `npm run test:cp-dp` / `npx tsx scripts/stress-test-dp.ts --count 50`.

- [ ] **Step 1: Implement `scripts/stress-test-dp.ts`**

CLI script executing 50 heavy test cases with live progress, per-test execution time logging, and ASCII CP scoreboard.

- [ ] **Step 2: Add `test:cp-dp` to `package.json`**

```json
"scripts": {
  "test:cp-dp": "npx tsx scripts/stress-test-dp.ts"
}
```

- [ ] **Step 3: Run the 50-test benchmark**

Run: `npm run test:cp-dp -- --count 50`
Expected: 50 heavy test cases complete with average GT runtime $\approx 0.5\text{s} - 1.0\text{s}$ per test, printing the CP scoreboard.

- [ ] **Step 4: Commit**

```bash
git add scripts/stress-test-dp.ts package.json
git commit -m "feat(cp): add CLI script for DP Bitmask stress testing"
```

---

## Plan Review Checklist
- [x] DP Bitmask 3-stage solver in Task 1.
- [x] Heavy random test generator ($N \in [8, 12]$, 0.5s - 1s/test) in Task 2.
- [x] 50-test runner script and CP scoreboard in Task 3.
- [x] All file paths and interfaces specified.
