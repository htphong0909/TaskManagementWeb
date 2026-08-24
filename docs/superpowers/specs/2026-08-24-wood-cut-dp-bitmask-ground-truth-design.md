# Design Spec: Wood-Cut DP Bitmask Ground Truth & Heavy Random Stress Testing (0.5s - 1s/test)

## Overview
This document specifies the technical design for:
1. **A DP Bitmask Ground Truth Solver (`dpGroundTruthOptimizer.ts`)** for the 2D Guillotine Bin Packing Problem with rotation and kerf.
2. **A Completely Randomized Heavy Test Generator (`heavyTestGenerator.ts`)** generating challenging test cases with $N \in [8, 12]$ pieces where Ground Truth execution time is calibrated around $0.5\text{s} - 1.0\text{s}$ per test.
3. **A Benchmark Runner Script (`scripts/stress-test-dp.ts`)** executing 50 heavy test cases and compiling a detailed Competitive Programming (CP) comparison report.

---

## 1. DP Bitmask Ground Truth Architecture (`dpGroundTruthOptimizer.ts`)

The algorithm solves 2D Guillotine Bin Packing exactly through three distinct stages:

### Stage 1: Single-Sheet Guillotine Feasibility Memoization
For an input set of $N$ pieces ($N \le 14$), there are $2^N$ possible subsets represented by bitmask $mask \in [0, 2^N - 1]$.
1. Filter masks where $\sum_{i \in mask} \text{Area}_i \le \text{StockArea}$.
2. For each candidate mask, determine whether all pieces in the mask can be packed onto a single stock sheet using 2D Guillotine cutting:
   - Recursive Guillotine placement: Place an item $i \in mask$ (testing both normal and 90° rotated orientations if `allowRotation` is true).
   - Split remaining space horizontally or vertically with kerf.
   - Partition the remaining items $mask \setminus \{i\}$ into sub-rectangles.
3. Store the result in `isValidSingleSheet[mask]: boolean` along with the best single-sheet packing layout `singleSheetLayout[mask]: PlacedPiece[]`.

### Stage 2: Submask Dynamic Programming ($O(3^N)$)
Find the minimum number of stock sheets required to pack the entire set of items:
- State: $DP[mask]$ = minimum number of stock sheets needed to pack the subset of pieces in $mask$.
- Base case: $DP[0] = 0$; $DP[mask] = \infty$ for all $mask > 0$.
- Transition:
  For each $mask \in [1, 2^N - 1]$:
  Iterate through all submasks $sub \subseteq mask$:
  If `isValidSingleSheet[sub]` is true:
  $$DP[mask] = \min(DP[mask], 1 + DP[mask \setminus sub])$$
  Store `parentSubmask[mask] = sub` to enable backtrack reconstruction.

### Stage 3: Exact Layout Reconstruction
- Start at $mask = 2^N - 1$.
- Trace back through `sub = parentSubmask[mask]`.
- Retrieve `singleSheetLayout[sub]` and append as a `PlacedStockSheet`.
- Update $mask \gets mask \setminus sub$ until $mask = 0$.
- Construct and return a complete `CalculationResult`.

---

## 2. Heavy Random Fuzzer Generator (`heavyTestGenerator.ts`)

All parameters are generated completely at random:
1. **Stock Sheets**:
   - Random length $L \in [800, 2440]\text{mm}$
   - Random width $W \in [400, 1220]\text{mm}$
2. **Piece Count**:
   - $N \in [8, 12]$ pieces per test case (calibrated for $0.5\text{s} - 1.0\text{s}$ GT execution).
3. **Piece Dimensions**:
   - Random mix of skinny strips, square pieces, and freeform rectangles.
   - Individual piece dimensions bounded by stock dimensions.
4. **Rotation Flags (`allowRotation`)**:
   - Randomly assigned `true` or `false` per piece with equal 50/50 probability.
5. **Kerf**:
   - Random choice from $[0, 2, 3, 5]\text{mm}$.
6. **Reproducibility**:
   - Powered by a deterministic Pseudo-Random Number Generator (Mulberry32) using configurable seeds.

---

## 3. Runner & CP Benchmark Scoreboard (`scripts/stress-test-dp.ts`)

Executes 50 heavy test cases and logs real-time progress:
- Displays per-test execution times for Ground Truth and Heuristic Optimizer.
- Generates a final CP Scoreboard:
  - **Total Test Cases**: 50
  - **Optimal Match Rate (%)**: $\frac{\text{Cases where Heuristic Sheets} = \text{GT Sheets}}{50} \times 100$
  - **Average Sheet Gap**: $\text{Mean}(\text{Heuristic Sheets} - \text{GT Sheets})$
  - **Average Waste Area Gap (%)**: $\text{Mean}(\text{Waste}_{\text{Heuristic}} - \text{Waste}_{\text{GT}})$
  - **Execution Time**: Average time per test for GT (target: $0.5\text{s} - 1.0\text{s}$) vs Heuristic ($\sim 0.05\text{ms}$).
  - **Speedup Factor**: $\frac{\text{GT Time}}{\text{Heuristic Time}}$.
  - **Detailed Sub-optimal Analysis**: Full dimension and rotation parameters for any cases where Heuristic was sub-optimal.

---

## 4. Verification Plan

1. **Unit Tests (`src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`)**:
   - Verify DP Bitmask correctness on small configurations ($N=3..5$).
   - Verify submask transition and layout reconstruction.
2. **CLI Benchmark Script (`npm run test:cp-dp`)**:
   - Execute `npx tsx scripts/stress-test-dp.ts --count 50`.
   - Confirm GT runtime per test averages $\approx 0.5\text{s} - 1.0\text{s}$.
   - Confirm Heuristic maintains high optimal match rate on heavy cases.
