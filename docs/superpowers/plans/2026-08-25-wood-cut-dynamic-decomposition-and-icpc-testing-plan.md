# Dynamic Oversized Decomposition & ICPC-Grade Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp thuật toán phân rã ván vượt khổ (`woodDecomposer.ts`) với cơ chế tính toán động toán học không giới hạn kích thước, sửa triệt để lỗi tấm $4002 \times 12210\text{mm}$, và xây dựng bộ kiểm thử đạt chuẩn thi đấu quốc tế ICPC với 5 Subtasks kiểm định bất biến hình học 100%.

**Architecture:**
1. **Dynamic Decomposition Engine (`woodDecomposer.ts`)**: Tính toán cận dưới toán học $NL_{\min}, NW_{\min}$ theo khổ ván, duyệt cửa sổ động, bổ sung Canonical Tiling Invariant Fallback cam kết 100% mảnh con $\le$ khổ ván gốc.
2. **ICPC Test Harness (`icpcStressTester.ts`)**: Bộ sinh test chuẩn ICPC bao gồm Corner cases, Needle cases, Massive panels, Multi-stock combinations, và 200 Seeded Fuzz cases.
3. **ICPC Judge Verifier (`woodCuttingICPCStress.test.ts`)**: Tích hợp `validateCuttingPlanIntegrity` để chấm bài và khẳng định 0 lỗi tràn viền, 0 lỗi đè hình trên toàn bộ các dải test từ $1\text{mm}$ tới $50,000\text{mm}$.

**Tech Stack:** TypeScript, Next.js 16, Vitest.

---

### Task 1: Dynamic Mathematical Decomposition Engine & Unit Tests

**Files:**
- Modify: `src/lib/woodDecomposer.ts`
- Test: `src/lib/__tests__/woodDecomposer.test.ts`

- [ ] **Step 1: Add failing test for user case $4002 \times 12210$ in `woodDecomposer.test.ts`**

In `src/lib/__tests__/woodDecomposer.test.ts`:
```typescript
it("decomposes extreme oversized piece (4002 x 12210) on stock (2440 x 1220) into valid subpieces", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];
  const pieces: RequiredPieceInput[] = [
    { id: "p1", name: "Tấm đại", length: 4002, width: 12210, quantity: 1, allowRotation: true },
  ];

  const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(pieces, stock, { kerf: 3, minSubPieceSize: 50 });

  expect(joinedDiagrams).toHaveLength(1);
  expect(joinedDiagrams[0].subPieces.length).toBeGreaterThanOrEqual(10);
  
  // 100% mọi mảnh con phải nằm gọn trong ván gốc 2440 x 1220 (hoặc xoay 1220 x 2440)
  for (const sp of flatCutItems) {
    const fitsNormal = sp.length <= 2440 && sp.width <= 1220;
    const fitsRotated = sp.length <= 1220 && sp.width <= 2440;
    expect(fitsNormal || fitsRotated).toBe(true);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodDecomposer.test.ts`
Expected: FAIL (pieces remain un-decomposed $4002 \times 12210$).

- [ ] **Step 3: Refactor `src/lib/woodDecomposer.ts` with Dynamic Mathematical Decomposition**

Implement:
1. `findOptimalDecomposition`:
   - Compute max feasible dimensions:
     ```typescript
     let maxStockL = 0;
     let maxStockW = 0;
     for (const s of stockSheets) {
       maxStockL = Math.max(maxStockL, s.length);
       maxStockW = Math.max(maxStockW, s.width);
       if (allowRot) {
         maxStockL = Math.max(maxStockL, s.width);
         maxStockW = Math.max(maxStockW, s.length);
       }
     }
     ```
   - Calculate minimum dynamic split bounds:
     ```typescript
     const minNL = Math.max(1, Math.ceil(L / maxStockL));
     const minNW = Math.max(1, Math.ceil(W / maxStockW));
     ```
   - Dynamically loop $NL \in [\min NL, \min NL + 2]$ and $NW \in [\min NW, \min NW + 2]$.
   - Invariant Fallback: Canonical Tiling (grid-based tiling strictly ensuring all pieces $\le S_L, S_W$).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodDecomposer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/woodDecomposer.ts src/lib/__tests__/woodDecomposer.test.ts
git commit -m "feat(wood-cut): implement dynamic mathematical decomposition engine for extreme oversized pieces"
```

---

### Task 2: ICPC-Grade Test Suite Generator (`icpcStressTester.ts`)

**Files:**
- Create: `src/lib/cp/icpcStressTester.ts`

- [ ] **Step 1: Implement `src/lib/cp/icpcStressTester.ts` with 5 ICPC Subtasks**

Create the generator with:
- Subtask 1: Corner Cases ($1\times 1$, $S_L \times S_W$, $S_L + 1 \times S_W$, $q=50$ small items).
- Subtask 2: Extreme Aspect Ratio / Needle Cases ($20000 \times 20$, $50000 \times 50$, $50 \times 30000$).
- Subtask 3: Massive Panels & Primes ($4002 \times 12210 \times 12$, $10007 \times 5003$, $15000 \times 15000$).
- Subtask 4: Grain Orientation Locks & Multi-Stock mixes.
- Subtask 5: 200 Seeded Randomized Stress Cases ($L, W \in [10, 50000]$).

- [ ] **Step 2: Commit Task 2**

```bash
git add src/lib/cp/icpcStressTester.ts
git commit -m "feat(wood-cut): implement ICPC-grade test harness and generator"
```

---

### Task 3: ICPC Stress Invariant Test Execution & Full Project Verification

**Files:**
- Create: `src/lib/__tests__/woodCuttingICPCStress.test.ts`

- [ ] **Step 1: Write `src/lib/__tests__/woodCuttingICPCStress.test.ts`**

Implement automated test runner executing all 5 Subtasks through `calculateWoodCut` and `validateCuttingPlanIntegrity`.
Assert `isValid === true`, `overlapsCount === 0`, `outOfBoundsCount === 0`, `orientationViolationsCount === 0` for 100% of test cases.

- [ ] **Step 2: Run ICPC stress tests**

Run: `npx vitest run src/lib/__tests__/woodCuttingICPCStress.test.ts`
Expected: PASS (100% of all Subtasks pass).

- [ ] **Step 3: Run full project test suite**

Run: `npm test`
Expected: All test files PASS.

- [ ] **Step 4: Commit Task 3 & Push to `origin/dev`**

```bash
git add src/lib/__tests__/woodCuttingICPCStress.test.ts
git commit -m "test(wood-cut): add comprehensive ICPC-grade 5-subtask stress invariant tests"
git push origin dev
```
