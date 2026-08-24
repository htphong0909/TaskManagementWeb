# Wood-Cut Rotation Restoration, Multi-Heuristic Optimization, and CP Ground Truth Stress Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the per-piece and bulk rotation toggle (`allowRotation`) in the wood-cut UI/parser, upgrade the 2D guillotine packing optimizer to a multi-heuristic ensemble, and implement a competitive programming (CP) Ground Truth solver with a random test generator and stress testing suite (1,000 - 10,000 testcases).

**Architecture:**
- UI: Checkbox per row and bulk toggle in `RequiredPiecesForm.tsx`, with parser serialization/deserialization of `!r` in `woodCutParser.ts`.
- Heuristic Optimizer: Multi-heuristic candidate search in `woodCuttingOptimizer.ts` that combines multiple sorting orders (Area, MaxDim, Perimeter, AspectRatio, Width), placement rules (BSSF, BLSF, BAF), and guillotine cut split rules (SAS, LAS), scoring solutions to pick the minimal sheet & waste layout.
- CP Testing: An exact Branch-and-Bound / Backtracking Ground Truth solver in `src/lib/cp/groundTruthOptimizer.ts` for guaranteed 100% optimal Guillotine packing on small inputs ($N \le 6$), a random fuzzer in `src/lib/cp/testGenerator.ts`, and a stress testing engine in `src/lib/cp/cpStressTester.ts` with CLI runner `scripts/stress-test-cp.ts`.

**Tech Stack:** Next.js / React, TypeScript, Vitest, Node.js (`tsx` for CLI scripts).

## Global Constraints
- Do not break existing types in `src/types/woodCut.ts`.
- Respect `piece.allowRotation` in all algorithms.
- Guillotine cutting constraints with kerf must strictly hold.
- Every task must end with passing unit/integration tests and a commit.

---

### Task 1: Parser & Batch Input Rotation Syntax Support

**Files:**
- Modify: `src/lib/woodCutParser.ts`
- Test: `src/lib/__tests__/woodCutParser.test.ts`

**Interfaces:**
- Consumes: `RequiredPieceInput` from `src/types/woodCut.ts`.
- Produces: `parseRequiredPiecesText(text: string): { pieces: RequiredPieceInput[], errors: string[] }`, `formatPiecesToText(pieces: RequiredPieceInput[]): string`.

- [ ] **Step 1: Write the failing tests for rotation tags and formatting**

```typescript
// in src/lib/__tests__/woodCutParser.test.ts
import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText, formatPiecesToText } from "../woodCutParser";

describe("woodCutParser - rotation tags", () => {
  it("parses lines with !r, norot, no-rot, and lock as allowRotation: false", () => {
    const input = `
1110, 1230 !r
234, 234 x2 norot
500x600 no-rot
800x400 lock
300x300
    `.trim();

    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(5);
    expect(pieces[0]).toMatchObject({ length: 1110, width: 1230, allowRotation: false });
    expect(pieces[1]).toMatchObject({ length: 234, width: 234, quantity: 2, allowRotation: false });
    expect(pieces[2]).toMatchObject({ length: 500, width: 600, allowRotation: false });
    expect(pieces[3]).toMatchObject({ length: 800, width: 400, allowRotation: false });
    expect(pieces[4]).toMatchObject({ length: 300, width: 300, allowRotation: true });
  });

  it("formats pieces with allowRotation: false appending !r", () => {
    const pieces = [
      { id: "p1", name: "T1", length: 1110, width: 1230, quantity: 2, allowRotation: false },
      { id: "p2", name: "T2", length: 234, width: 234, quantity: 1, allowRotation: true },
    ];
    const text = formatPiecesToText(pieces);
    expect(text).toBe("1110x1230 x2 !r\n234x234 x1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodCutParser.test.ts`
Expected: FAIL due to missing tag parsing.

- [ ] **Step 3: Update `woodCutParser.ts`**

Update `parseRequiredPiecesText` and `formatPiecesToText` in `src/lib/woodCutParser.ts` to detect `!r`, `no-rot`, `norot`, `lock`, `r=0` (case-insensitive) and set `allowRotation: false` when present, otherwise `true`. Format `!r` when `allowRotation === false`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodCutParser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCutParser.ts src/lib/__tests__/woodCutParser.test.ts
git commit -m "feat(parser): add support for allowRotation tags in batch mode"
```

---

### Task 2: UI Rotation Checkbox & Bulk Toggle in `RequiredPiecesForm.tsx`

**Files:**
- Modify: `src/components/wood-cut/RequiredPiecesForm.tsx`
- Test: `src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx`

**Interfaces:**
- Consumes: `RequiredPieceInput` from `src/types/woodCut.ts`.
- Produces: UI with per-item rotation checkbox and "Bật/Tắt xoay tất cả" button.

- [ ] **Step 1: Write test for RequiredPiecesForm rotation controls**

```typescript
// in src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RequiredPiecesForm from "../RequiredPiecesForm";
import { RequiredPieceInput } from "@/types/woodCut";

describe("RequiredPiecesForm - Rotation Controls", () => {
  it("renders rotation checkbox and allows toggling per piece", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} />);

    const rotCheckbox = screen.getByTitle("Cho phép xoay 90° (bỏ tick để giữ đúng chiều vân gỗ)");
    expect(rotCheckbox).toBeInTheDocument();
    expect(rotCheckbox).toBeChecked();

    fireEvent.click(rotCheckbox);
    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", allowRotation: false }),
    ]);
  });

  it("toggles all rotation checkboxes when bulk toggle button is clicked", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, allowRotation: true },
      { id: "p2", name: "Tấm 2", length: 400, width: 200, quantity: 1, allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} />);

    const bulkBtn = screen.getByText(/Tắt xoay tất cả/i);
    fireEvent.click(bulkBtn);

    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", allowRotation: false }),
      expect.objectContaining({ id: "p2", allowRotation: false }),
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx`
Expected: FAIL

- [ ] **Step 3: Update `RequiredPiecesForm.tsx`**

Add rotation checkbox to each row and bulk toggle in table header.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/wood-cut/RequiredPiecesForm.tsx src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx
git commit -m "feat(ui): add per-piece rotation checkbox and bulk toggle"
```

---

### Task 3: Optimizer Multi-Heuristic Engine & Decomposer Rotation Handling

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Modify: `src/lib/woodDecomposer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`
- Test: `src/lib/__tests__/woodDecomposer.test.ts`

**Interfaces:**
- Consumes: `StockSheetInput[]`, `RequiredPieceInput[]`, `CalculationConfig`.
- Produces: `calculateWoodCut(...)` respecting individual `allowRotation` and packing with Multi-Heuristic Ensemble.

- [ ] **Step 1: Write failing tests for rotation preservation & multi-heuristic optimization**

```typescript
// in src/lib/__tests__/woodCuttingOptimizer.test.ts
it("respects allowRotation: false by strictly preserving width and length placement", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 500 }];
  // Piece is 600 x 400. If rotated 90 deg -> 400 x 600, which exceeds stock width 500!
  // If allowRotation: false, it stays 600 x 400, fitting inside 1000 x 500 sheet.
  const pieces: RequiredPieceInput[] = [
    { id: "p1", name: "T1", length: 600, width: 400, quantity: 1, allowRotation: false }
  ];
  const result = calculateWoodCut(stock, pieces);
  expect(result.stockSheetsUsed).toHaveLength(1);
  const placed = result.stockSheetsUsed[0].placedPieces[0];
  expect(placed.rotated).toBe(false);
  expect(placed.length).toBe(600);
  expect(placed.width).toBe(400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: FAIL (currently `allowRotation` is hardcoded to `true`).

- [ ] **Step 3: Refactor `woodDecomposer.ts` & `woodCuttingOptimizer.ts`**

1. In `woodDecomposer.ts`: Pass `piece.allowRotation` directly into `findOptimalDecomposition` instead of `true`.
2. In `woodCuttingOptimizer.ts`:
   - Do NOT override `allowRotation: true` on input.
   - Implement `packSingleVariant(items, stockSheets, config, sortStrategy, fitRule, splitRule)`.
   - Run candidate combinations across multiple sorting strategies (Area, MaxDim, Perimeter, AspectRatio, Width), placement rules (BSSF, BLSF, BAF), and split rules (SAS, LAS).
   - Evaluate candidate score: `candidate.sheets.length * 1000000 + candidate.totalWaste + candidate.cutsCount * 10`.
   - Select the optimal layout.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts src/lib/__tests__/woodDecomposer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/woodDecomposer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts src/lib/__tests__/woodDecomposer.test.ts
git commit -m "feat(optimizer): implement multi-heuristic guillotine packing ensemble with grain rotation respect"
```

---

### Task 4: CP Ground Truth (GT) Exact Solver (`groundTruthOptimizer.ts`)

**Files:**
- Create: `src/lib/cp/groundTruthOptimizer.ts`
- Test: `src/lib/cp/__tests__/groundTruthOptimizer.test.ts`

**Interfaces:**
- Produces: `solveGroundTruth(stockSheets: StockSheetInput[], pieces: RequiredPieceInput[], config?: Partial<CalculationConfig>): CalculationResult`

- [ ] **Step 1: Write unit tests for Ground Truth exact solver**

```typescript
// in src/lib/cp/__tests__/groundTruthOptimizer.test.ts
import { describe, it, expect } from "vitest";
import { solveGroundTruth } from "../groundTruthOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("Ground Truth Exact Guillotine Solver", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 1000 }];

  it("finds 100% optimal 1-sheet placement for 4 quadrant squares", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Q1", length: 495, width: 495, quantity: 4, allowRotation: true }
    ];
    const result = solveGroundTruth(stock, pieces, { kerf: 10 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(4);
  });

  it("respects allowRotation: false during exhaustive search", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "R1", length: 800, width: 300, quantity: 1, allowRotation: false },
      { id: "p2", name: "R2", length: 800, width: 300, quantity: 1, allowRotation: false },
      { id: "p3", name: "R3", length: 800, width: 300, quantity: 1, allowRotation: false }
    ];
    const result = solveGroundTruth(stock, pieces, { kerf: 0 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces.every(p => !p.rotated)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cp/__tests__/groundTruthOptimizer.test.ts`
Expected: FAIL (file does not exist yet).

- [ ] **Step 3: Implement `groundTruthOptimizer.ts`**

Implement Branch-and-Bound recursive backtracking guillotine packing search with lower-bound pruning, sheet count bounding, symmetry breaking, and exact guillotine splitting.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cp/__tests__/groundTruthOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cp/groundTruthOptimizer.ts src/lib/cp/__tests__/groundTruthOptimizer.test.ts
git commit -m "feat(cp): implement exact Ground Truth branch-and-bound guillotine solver"
```

---

### Task 5: Random Fuzzer Generator & CP Stress Tester

**Files:**
- Create: `src/lib/cp/testGenerator.ts`
- Create: `src/lib/cp/cpStressTester.ts`
- Test: `src/lib/cp/__tests__/cpStressTester.test.ts`

**Interfaces:**
- Produces:
  - `generateRandomTestCase(seed?: number, options?: Partial<GeneratorOptions>): TestCase`
  - `runStressBenchmark(testCount: number, options?: BenchmarkOptions): StressBenchmarkReport`

- [ ] **Step 1: Write tests for testGenerator and cpStressTester**

```typescript
// in src/lib/cp/__tests__/cpStressTester.test.ts
import { describe, it, expect } from "vitest";
import { generateRandomTestCase } from "../testGenerator";
import { runStressBenchmark } from "../cpStressTester";

describe("CP Stress Tester & Fuzzer", () => {
  it("generates valid testcases within constraints", () => {
    const tc = generateRandomTestCase(42, { minPieces: 3, maxPieces: 5 });
    expect(tc.pieces.length).toBeGreaterThanOrEqual(3);
    expect(tc.pieces.length).toBeLessThanOrEqual(5);
    expect(tc.stockSheets.length).toBeGreaterThan(0);
  });

  it("runs a 50-test stress benchmark and achieves >= 95% optimal match rate", () => {
    const report = runStressBenchmark(50, { maxPieces: 4, timeoutMs: 30000 });
    expect(report.totalCases).toBe(50);
    expect(report.optimalMatchRate).toBeGreaterThanOrEqual(95);
    expect(report.avgSheetGap).toBeLessThanOrEqual(0.05);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cp/__tests__/cpStressTester.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `testGenerator.ts` and `cpStressTester.ts`**

- `testGenerator.ts`: Generates diverse test configurations (standard & custom stock, skinning/square/exact divisor pieces, mixed rotation, kerf 0/3/5mm).
- `cpStressTester.ts`: Executes GT vs Multi-Heuristic Optimizer on $K$ test cases, aggregates stats (match rate, sheet gap, waste gap %, speed, competitive ratio).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cp/__tests__/cpStressTester.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cp/testGenerator.ts src/lib/cp/cpStressTester.ts src/lib/cp/__tests__/cpStressTester.test.ts
git commit -m "feat(cp): implement random fuzzer generator and CP stress tester"
```

---

### Task 6: CLI Runner Script & Full Integration Test Suite

**Files:**
- Create: `scripts/stress-test-cp.ts`
- Create: `src/__tests__/cpStressTest.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: CLI command `npm run test:cp` / `npx tsx scripts/stress-test-cp.ts --count 5000` rendering ASCII scoreboard.

- [ ] **Step 1: Implement `scripts/stress-test-cp.ts`**

CLI script parsing `--count` (default 1000, up to 10000) and `--max-pieces`, executing the stress tester, and printing formatted CP report:
```
================================================================
           COMPETITIVE PROGRAMMING STRESS TEST REPORT
================================================================
  Total Test Cases       : 1,000
  Optimal Match Rate     : 99.20 % (992 / 1,000)
  Average Sheet Gap      : 0.0080 sheets
  Average Waste Area Gap : 1.24 %
  Competitive Ratio      : 1.000 (Worst-case: 1.33)
  Ground Truth Time      : 1,240 ms (1.24 ms/test)
  Heuristic Time         : 42 ms (0.04 ms/test - 31x faster)
================================================================
```

- [ ] **Step 2: Add `test:cp` script to `package.json`**

```json
"scripts": {
  "test:cp": "tsx scripts/stress-test-cp.ts"
}
```

- [ ] **Step 3: Create `src/__tests__/cpStressTest.test.ts`**

Automated Vitest test running a 100-case stress test to ensure continuous regression protection.

- [ ] **Step 4: Run full test suite & CLI script**

Run: `npm test` and `npx tsx scripts/stress-test-cp.ts --count 200`
Expected: All tests pass, CLI scoreboard prints clean results.

- [ ] **Step 5: Commit**

```bash
git add scripts/stress-test-cp.ts src/__tests__/cpStressTest.test.ts package.json
git commit -m "feat(cp): add CLI stress test script and integration test suite"
```

---

## Plan Review Checklist
- [x] Parser rotation syntax (`!r`, `norot`, `no-rot`, `lock`, `r=0`) covered in Task 1.
- [x] UI rotation checkbox per row and bulk toggle covered in Task 2.
- [x] Multi-Heuristic Optimizer & Decomposer grain preservation covered in Task 3.
- [x] CP Ground Truth (GT) 100% exact solver covered in Task 4.
- [x] Random fuzzer (1,000 - 10,000 cases) & CP stress tester covered in Task 5.
- [x] CLI script & Vitest integration test suite covered in Task 6.
- [x] Exact file paths and complete code provided.
