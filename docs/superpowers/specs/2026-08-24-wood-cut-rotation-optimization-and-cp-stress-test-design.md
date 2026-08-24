# Design Spec: Wood-Cut Rotation Restoration, Multi-Heuristic Optimization, and CP Ground Truth Stress Testing

## Overview
This document specifies the technical design for:
1. **Restoring & Enhancing the Rotation Option (`allowRotation`)** on the `/wood-cut` page, including per-piece toggle, batch paste syntax support, and quick select-all toggling.
2. **Optimizing the Guillotine 2D Packing Algorithm** using a high-performance **Multi-Heuristic Ensemble** (Best-of-N Candidate Search) that evaluates multiple sorting orders, placement criteria, and guillotine cut split rules.
3. **Competitive Programming (CP) Ground Truth & Stress Testing Framework**:
   - An exact **Branch-and-Bound / Backtracking Ground Truth (GT)** algorithm that is guaranteed 100% optimal for small instances.
   - A **Random Fuzzer Testcase Generator** capable of producing 1,000 to 10,000 diverse small test cases.
   - A **CP Benchmark & Stress Test Runner** calculating optimal match rate (win rate), average gap / error, competitive ratio, and runtime performance.

---

## 1. UI & Parser: Rotation Option Restoration

### 1.1 `RequiredPiecesForm.tsx` (Table Mode & Batch Mode)
- **Table Mode**:
  - Add a **"Xoay 🔄"** checkbox column for each required piece row.
  - Default value: `true` (checked).
  - Add a header action button: **"🔄 Bật/Tắt xoay tất cả"** to toggle all pieces at once.
- **Batch Mode**:
  - Support syntax tags to indicate `allowRotation: false`:
    - `1110x1230 !r`
    - `1110x1230 no-rot` / `norot`
    - `1110, 1230 lock`
    - `1110 1230 r=0`
  - When none of the above tags are provided, defaults to `allowRotation: true`.
- **Serialization (`formatPiecesToText`)**:
  - If a piece has `allowRotation === false`, outputs `!r` at the end of the line (e.g. `1110x1230 x2 !r`).

---

## 2. Algorithm Optimization: Multi-Heuristic Packing Ensemble

### 2.1 Problem Analysis
A single greedy pass with fixed sorting (Area Descending) and fixed placement rule (Best Short Side Fit) can fall into local traps, especially when rotation is enabled for some pieces and disabled for others (grain constraint).

### 2.2 Multi-Heuristic Architecture (`woodCuttingOptimizer.ts`)
Instead of running a single hardcoded heuristic, the optimizer runs an ensemble of $K$ distinct heuristic strategies and selects the candidate that minimizes total stock sheets, waste area, and cut count:

1. **Sorting Strategies**:
   - `AREA_DESC`: Sort by `length * width` descending.
   - `MAX_DIM_DESC`: Sort by `Math.max(length, width)` descending.
   - `PERIMETER_DESC`: Sort by `length + width` descending.
   - `ASPECT_RATIO_DESC`: Sort by `Math.max(length, width) / Math.min(length, width)` descending.
   - `WIDTH_DESC`: Sort by `width` descending.
   - `LENGTH_DESC`: Sort by `length` descending.

2. **Placement Rules**:
   - `BSSF` (Best Short Side Fit): Minimizes $\min(\text{remW}, \text{remH})$.
   - `BLSF` (Best Long Side Fit): Minimizes $\max(\text{remW}, \text{remH})$.
   - `BAF` (Best Area Fit): Minimizes $\text{remW} \times \text{remH}$.

3. **Guillotine Cut Split Rules**:
   - `SAS` (Shorter Axis Split): Splits along the shorter leftover axis (preserves larger rectangular remnants).
   - `LAS` (Longer Axis Split): Splits along the longer leftover axis.

4. **Rotation Handling**:
   - If `item.allowRotation === true`, evaluates both orientations (`(length, width)` and `(width, length)`).
   - If `item.allowRotation === false`, strictly evaluates only `(length, width)`.

5. **Evaluation Function**:
   $$\text{Score} = \text{SheetsUsed} \times 1\,000\,000 + \text{TotalWasteArea} + \text{TotalCuts} \times 10$$
   The candidate with the lowest score is selected. Total execution time for all combinations remains under $15\text{ms}$ in JavaScript.

---

## 3. Competitive Programming (CP) Ground Truth & Stress Testing

### 3.1 Ground Truth Solver (`groundTruthOptimizer.ts`)
An exact solver using **Branch-and-Bound with Recursive Backtracking**:
- **Guaranteed 100% Optimal**: Finds the global minimum number of stock sheets and maximum packing density.
- **Search State**: $(\text{unplaced\_pieces}, \text{active\_sheets})$.
- **Pruning & Bounding**:
  1. *Theoretical Lower Bound*: $LB = \lceil \sum \text{Area}(\text{pieces}) / \text{StockArea} \rceil$. If the solver finds a valid placement with $LB$ sheets and minimal waste, it can terminate early.
  2. *Sheet Count Bound*: If $\text{current\_sheets.length} \ge \text{best\_known\_sheets}$, prune the branch.
  3. *Symmetry Breaking*: Do not explore symmetric placement orders or duplicate sheet openings.
  4. *Exhaustive Orientation & Split*: For each piece, branches on valid orientations (considering `allowRotation`) and all valid guillotine free rectangles and split directions.

### 3.2 Random Fuzzer Generator (`testGenerator.ts`)
Generates 1,000 to 10,000 randomized test cases with configurable distribution:
- **Stock Sizes**: Standard (2440x1220, 1200x600) and randomized rectangular sheets.
- **Piece Counts**: $N \in [2, 6]$ pieces (suitable for sub-second exact GT verification).
- **Piece Dimensions**:
  - Extreme ratios (skinny strips, e.g. 1000x80).
  - Exact divisors (e.g. 600x300 for 1200x600).
  - Tight fit pieces (e.g. 1190x590 with 3mm kerf).
  - Square pieces.
- **Rotation Flag**: 50% all `true`, 25% all `false`, 25% mixed `true/false`.
- **Kerf**: 0mm, 3mm, 5mm.

### 3.3 Stress Test Runner & CP Scoreboard (`cpStressTester.ts`, `scripts/stress-test-cp.ts`, and test suite)
Runs the test cases against both **Ground Truth (GT)** and **Optimized Heuristic**:

#### Output Metrics:
1. **Total Test Cases**: e.g., $10\,000$ runs.
2. **Optimal Match Rate**: Percentage of tests where $\text{Sheets}_{\text{Heuristic}} == \text{Sheets}_{\text{GT}}$ (Target: $\ge 98\%$).
3. **Average Sheet Gap**: $\frac{1}{M} \sum (\text{Sheets}_{\text{Heuristic}} - \text{Sheets}_{\text{GT}})$.
4. **Average Area Waste Gap (%)**: Difference in packing efficiency between GT and Heuristic.
5. **Worst Case Ratio (Competitive Ratio)**: $\max \left( \frac{\text{Sheets}_{\text{Heuristic}}}{\text{Sheets}_{\text{GT}}} \right)$.
6. **Execution Speed Comparison**: Total time and time per test for GT vs Heuristic.

---

## 4. Verification Plan

### Automated Tests
1. `npm test` - Vitest suite running:
   - `src/__tests__/woodCutRotation.test.ts`: Tests rotation toggle, batch parser tags, and grain preservation (`allowRotation = false`).
   - `src/__tests__/woodCutOptimizerMultiHeuristic.test.ts`: Tests multi-heuristic candidate selection.
   - `src/__tests__/cpStressTest.test.ts`: Runs automated CP stress test (e.g. 500-1000 test cases) verifying high optimal match rate ($\ge 98\%$) and zero crashes.
2. Dedicated CLI benchmark script:
   - `npx tsx scripts/stress-test-cp.ts --count 5000` to run 5,000 to 10,000 tests and print the detailed CP scoreboard table.

### Manual Verification
1. Open `/wood-cut` page in browser.
2. Verify checkbox "Xoay" per row, "Bật/Tắt xoay tất cả", and verify batch paste with `!r`.
3. Verify visual rendering of diagrams with rotated and non-rotated pieces.
