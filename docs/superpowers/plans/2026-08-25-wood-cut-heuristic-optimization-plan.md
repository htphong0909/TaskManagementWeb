# Wood Cut Heuristic Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tối ưu hóa độ chính xác của thuật toán Heuristic 2D Guillotine Cutting Stock (`calculateWoodCut`) từ mức baseline 84.00% lên $\ge$ 96% - 99% so với nghiệm chính xác tuyệt đối của DP Ground Truth (`solveGroundTruthDP`), giữ thời gian phản hồi UI $\le$ 15ms.

**Architecture:** Xây dựng kiến trúc Hybrid Multi-Stage Heuristic Engine:
1. Cơ chế Quản lý Không gian Nâng cao: Gộp khoảng trống tự động (`coalesceFreeRectangles`) & mở rộng bộ quy tắc cắt Guillotine (`MINAS`, `MAXAS`, `SLAS`, `LLAS`) và quy tắc chọn vị trí tiếp xúc viền (`BPCF`).
2. Tầng Deterministic Extended Ensemble: Kết hợp đa dạng Sorters, Fit rules, Split rules và 2 cơ chế phân bổ ván (`GLOBAL_BEST_FIT` & `SHEET_BY_SHEET`).
3. Tầng Adaptive GRASP & 2-Opt Local Search: Tìm kiếm ngẫu nhiên có trọng số và hoán đổi vị trí cục bộ để giải quyết các trường hợp bế tắc không gian với Time Guard < 15ms.

**Tech Stack:** TypeScript, Next.js 16, Vitest.

## Global Constraints

- Không làm thay đổi interface `CalculationResult`, `StockSheetInput`, `RequiredPieceInput`, `CalculationConfig`.
- Thời gian tính toán Heuristic trung bình trên mỗi yêu cầu $\le 15$ms trong UI.
- Thuật toán phải đảm bảo 100% hợp lệ về nguyên tắc cắt Guillotine (vết cắt thẳng từ cạnh này sang cạnh kia) và có bù độ dày lưỡi cưa (`kerf`).
- Tất cả unit test trong `src/lib/__tests__` và `src/lib/cp/__tests__` phải chạy PASS 100%.

---

### Task 1: Free Rectangle Coalescing / Merging Engine

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Produces: `export function coalesceFreeRectangles(freeRects: FreeRectangle[]): FreeRectangle[]`

- [ ] **Step 1: Write the failing unit tests for `coalesceFreeRectangles`**

Create/update `src/lib/__tests__/woodCuttingOptimizer.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { coalesceFreeRectangles } from "../woodCuttingOptimizer";
import { FreeRectangle } from "@/types/woodCut";

describe("FreeRectangle Coalescing", () => {
  it("merges two vertically adjacent rectangles with the same x and width", () => {
    const rects: FreeRectangle[] = [
      { x: 0, y: 0, width: 500, height: 300 },
      { x: 0, y: 300, width: 500, height: 200 },
    ];
    const merged = coalesceFreeRectangles(rects);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({ x: 0, y: 0, width: 500, height: 500 });
  });

  it("merges two horizontally adjacent rectangles with the same y and height", () => {
    const rects: FreeRectangle[] = [
      { x: 0, y: 0, width: 400, height: 600 },
      { x: 400, y: 0, width: 300, height: 600 },
    ];
    const merged = coalesceFreeRectangles(rects);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({ x: 0, y: 0, width: 700, height: 600 });
  });

  it("does not merge non-adjacent or mismatched rectangles", () => {
    const rects: FreeRectangle[] = [
      { x: 0, y: 0, width: 400, height: 600 },
      { x: 500, y: 0, width: 300, height: 600 },
    ];
    const merged = coalesceFreeRectangles(rects);
    expect(merged).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: FAIL with `coalesceFreeRectangles is not defined` or not exported.

- [ ] **Step 3: Implement `coalesceFreeRectangles` in `src/lib/woodCuttingOptimizer.ts`**

Add the following implementation into `src/lib/woodCuttingOptimizer.ts`:
```typescript
export function coalesceFreeRectangles(freeRects: FreeRectangle[]): FreeRectangle[] {
  let rects = freeRects.map((r) => ({ ...r }));
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];

        // 1. Gộp Dọc (cùng x, cùng width, tiếp xúc Y)
        if (a.x === b.x && a.width === b.width) {
          if (a.y + a.height === b.y) {
            a.height += b.height;
            rects.splice(j, 1);
            merged = true;
            break;
          } else if (b.y + b.height === a.y) {
            b.height += a.height;
            rects.splice(i, 1);
            merged = true;
            break;
          }
        }

        // 2. Gộp Ngang (cùng y, cùng height, tiếp xúc X)
        if (a.y === b.y && a.height === b.height) {
          if (a.x + a.width === b.x) {
            a.width += b.width;
            rects.splice(j, 1);
            merged = true;
            break;
          } else if (b.x + b.width === a.x) {
            b.width += a.width;
            rects.splice(i, 1);
            merged = true;
            break;
          }
        }
      }
      if (merged) break;
    }
  }

  return rects;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts
git commit -m "feat(wood-cut): add free rectangle coalescing engine and unit tests"
```

---

### Task 2: Extended Split Rules & Fit Rules

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Sorters: `"AREA_DESC" | "MAX_DIM_DESC" | "PERIMETER_DESC" | "ASPECT_RATIO_DESC" | "WIDTH_DESC" | "LENGTH_DESC" | "COMBINED_PRIORITY_DESC" | "SIDE_RATIO_DESC"`
- Fit Rules: `"BSSF" | "BLSF" | "BAF" | "BPCF"`
- Split Rules: `"SAS" | "LAS" | "MINAS" | "MAXAS" | "SLAS" | "LLAS"`

- [ ] **Step 1: Write unit tests for new Split & Fit rules**

Append to `src/lib/__tests__/woodCuttingOptimizer.test.ts`:
```typescript
import { scoreFit, splitFreeRectangle } from "../woodCuttingOptimizer";

describe("Extended Fit & Split Rules", () => {
  it("scores BPCF (Best Perimeter Contact Fit) correctly when touching sheet edges", () => {
    // Chi tiết 400x300 đặt tại gốc (0,0) của ô 1000x800 trong tấm 1000x800
    // Tiếp xúc cạnh trái x=0 (300mm) và cạnh dưới y=0 (400mm) => contact = 700mm
    const score = scoreFit(1000 - 400, 800 - 300, 0, 0, 400, 300, 1000, 800, "BPCF");
    expect(score).toBeLessThan(0); // BPCF trả về điểm âm để giá trị tiếp xúc càng lớn thì score càng nhỏ (ưu tiên nhất)
  });

  it("splits rectangle according to MINAS (Minimize Area Split)", () => {
    const targetRect: FreeRectangle = { x: 0, y: 0, width: 800, height: 600 };
    const splits = splitFreeRectangle(targetRect, 500, 400, 3, "MINAS");
    expect(splits.length).toBeGreaterThan(0);
    // Tổng diện tích 2 mảnh con phải nhỏ hơn targetRect do trừ kerf
    const sumArea = splits.reduce((acc, r) => acc + r.width * r.height, 0);
    expect(sumArea).toBeLessThan(800 * 600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement new Sorters, Split Rules and Fit Rules in `src/lib/woodCuttingOptimizer.ts`**

Update `SortStrategy`, `FitRule`, `SplitRule`, `scoreFit`, and `splitFreeRectangle`:
```typescript
export type SortStrategy =
  | "AREA_DESC"
  | "MAX_DIM_DESC"
  | "PERIMETER_DESC"
  | "ASPECT_RATIO_DESC"
  | "WIDTH_DESC"
  | "LENGTH_DESC"
  | "COMBINED_PRIORITY_DESC"
  | "SIDE_RATIO_DESC";

export type FitRule = "BSSF" | "BLSF" | "BAF" | "BPCF";
export type SplitRule = "SAS" | "LAS" | "MINAS" | "MAXAS" | "SLAS" | "LLAS";

export function scoreFit(
  remW: number,
  remH: number,
  placedX: number,
  placedY: number,
  placedW: number,
  placedH: number,
  sheetW: number,
  sheetH: number,
  rule: FitRule
): number {
  switch (rule) {
    case "BSSF":
      return Math.min(remW, remH);
    case "BLSF":
      return Math.max(remW, remH);
    case "BAF":
      return remW * remH;
    case "BPCF": {
      // Tính chu vi tiếp xúc viền tấm ván
      let contactPerimeter = 0;
      if (placedX === 0) contactPerimeter += placedH;
      if (placedY === 0) contactPerimeter += placedW;
      if (placedX + placedW === sheetW) contactPerimeter += placedH;
      if (placedY + placedH === sheetH) contactPerimeter += placedW;
      // Điểm càng thấp càng ưu tiên => lấy -contactPerimeter + diện tích thừa nhỏ
      return -contactPerimeter * 1000 + (remW * remH) / 1000;
    }
  }
}

export function splitFreeRectangle(
  targetRect: FreeRectangle,
  placedW: number,
  placedH: number,
  kerf: number,
  rule: SplitRule
): FreeRectangle[] {
  const remW = targetRect.width - placedW - kerf;
  const remH = targetRect.height - placedH - kerf;
  if (remW <= 0 && remH <= 0) return [];

  let splitHorizontalFirst: boolean;

  switch (rule) {
    case "SAS":
      splitHorizontalFirst = placedW <= placedH;
      break;
    case "LAS":
      splitHorizontalFirst = placedW >= placedH;
      break;
    case "MINAS": {
      // Chia ngang: Mảnh 1 (remW x placedH), Mảnh 2 (targetRect.width x remH)
      // Chia dọc: Mảnh 1 (remW x targetRect.height), Mảnh 2 (placedW x remH)
      const minAreaHoriz = Math.min(remW * placedH, targetRect.width * remH);
      const minAreaVert = Math.min(remW * targetRect.height, placedW * remH);
      splitHorizontalFirst = minAreaHoriz <= minAreaVert;
      break;
    }
    case "MAXAS": {
      const maxAreaHoriz = Math.max(remW * placedH, targetRect.width * remH);
      const maxAreaVert = Math.max(remW * targetRect.height, placedW * remH);
      splitHorizontalFirst = maxAreaHoriz >= maxAreaVert;
      break;
    }
    case "SLAS":
      splitHorizontalFirst = remW <= remH;
      break;
    case "LLAS":
      splitHorizontalFirst = remW >= remH;
      break;
  }

  const result: FreeRectangle[] = [];
  if (splitHorizontalFirst) {
    if (remW >= 5 && placedH >= 5) {
      result.push({
        x: targetRect.x + placedW + kerf,
        y: targetRect.y,
        width: remW,
        height: placedH,
      });
    }
    if (remH >= 5 && targetRect.width >= 5) {
      result.push({
        x: targetRect.x,
        y: targetRect.y + placedH + kerf,
        width: targetRect.width,
        height: remH,
      });
    }
  } else {
    if (remW >= 5 && targetRect.height >= 5) {
      result.push({
        x: targetRect.x + placedW + kerf,
        y: targetRect.y,
        width: remW,
        height: targetRect.height,
      });
    }
    if (remH >= 5 && placedW >= 5) {
      result.push({
        x: targetRect.x,
        y: targetRect.y + placedH + kerf,
        width: placedW,
        height: remH,
      });
    }
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts
git commit -m "feat(wood-cut): implement extended split and fit rules for guillotine packing"
```

---

### Task 3: Deterministic Extended Multi-Heuristic Ensemble & Sheet Allocation Modes

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Produces: `export type SheetAllocationMode = "GLOBAL_BEST_FIT" | "SHEET_BY_SHEET"`
- Updates: `packCandidate` integrates `coalesceFreeRectangles`, extended sort, fit, split rules and allocation modes.

- [ ] **Step 1: Write tests for deterministic ensemble and sheet allocation**

Append to `src/lib/__tests__/woodCuttingOptimizer.test.ts`:
```typescript
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("Deterministic Extended Ensemble", () => {
  it("packs pieces compactly using coalescing without overlapping", () => {
    const stock: StockSheetInput[] = [{ id: "s1", name: "Ván 1000x1000", length: 1000, width: 1000 }];
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "C1", length: 500, width: 500, quantity: 1, allowRotation: true },
      { id: "p2", name: "C2", length: 500, width: 500, quantity: 1, allowRotation: true },
      { id: "p3", name: "C3", length: 500, width: 500, quantity: 1, allowRotation: true },
      { id: "p4", name: "C4", length: 500, width: 500, quantity: 1, allowRotation: true },
    ];
    const res = calculateWoodCut(stock, pieces, { kerf: 0 });
    expect(res.stockSheetsUsed).toHaveLength(1);
    expect(res.stockSheetsUsed[0].placedPieces).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`

- [ ] **Step 3: Implement Enhanced `packCandidate` & Ensemble in `src/lib/woodCuttingOptimizer.ts`**

Update `packCandidate` to:
1. Accept `mode: SheetAllocationMode`.
2. Apply `scoreFit` with position context and `splitFreeRectangle`.
3. Call `coalesceFreeRectangles(targetSheet.freeRects)` after each item placement to immediately eliminate space fragmentation.
4. Run high-impact combinations in `calculateWoodCut`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts
git commit -m "feat(wood-cut): integrate coalescing and multi-allocation ensemble into packing engine"
```

---

### Task 4: Adaptive GRASP & 2-Opt Local Search Layer

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Produces: `runGRASPRefinement(...)` executing randomized restricted candidate sampling and 2-opt perturbations bounded by a 15ms time budget.

- [ ] **Step 1: Write tests for GRASP refinement**

Append to `src/lib/__tests__/woodCuttingOptimizer.test.ts`:
```typescript
describe("GRASP & Local Search Refinement", () => {
  it("consistently returns equal or fewer sheets than simple single heuristic", () => {
    const stock: StockSheetInput[] = [{ id: "s1", name: "Ván 1200x800", length: 1200, width: 800 }];
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "P1", length: 600, width: 400, quantity: 2, allowRotation: true },
      { id: "p2", name: "P2", length: 600, width: 400, quantity: 2, allowRotation: true },
    ];
    const res = calculateWoodCut(stock, pieces, { kerf: 3 });
    expect(res.stockSheetsUsed.length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify baseline**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`

- [ ] **Step 3: Implement GRASP & 2-Opt Local Search in `src/lib/woodCuttingOptimizer.ts`**

Implement:
1. Fast Pseudo-Random Generator (LCG) for deterministic, reproducible fast execution.
2. Randomized permutation generator with softmax priority bias.
3. Time budget loop (`performance.now() - startTime < 12ms`) running 30–50 randomized passes + 2-opt swaps.
4. Keep best candidate solution with minimal score.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts
git commit -m "feat(wood-cut): add adaptive GRASP and 2-opt local search with time budget guard"
```

---

### Task 5: DP Ground Truth Stress Benchmark & Comprehensive Verification

**Files:**
- Modify: `src/lib/cp/dpStressTester.ts` (if needed for extended stats)
- Modify: `scripts/stress-test-dp.ts`
- Test: `src/lib/cp/__tests__/dpStressTester.test.ts`

**Interfaces:**
- Verifies: `Optimal Match Rate >= 96.00%`, `Average Sheet Gap <= 0.0400 sheets`, `Avg Heuristic Time <= 15ms`.

- [ ] **Step 1: Run 10-test DP Stress Benchmark**

Run: `npx tsx scripts/stress-test-dp.ts -n 10 -min 8 -max 10 -s 2026`
Expected: 10/10 MATCH (100%), Average Sheet Gap = 0.0000.

- [ ] **Step 2: Run 50-test DP Heavy Stress Benchmark**

Run: `npx tsx scripts/stress-test-dp.ts -n 50 -min 9 -max 12 -s 2026`
Expected: Optimal Match Rate $\ge$ 96.00% (at least 48/50 matches vs 42/50 prior), Avg Sheet Gap $\le$ 0.04 sheets.

- [ ] **Step 3: Run full Vitest test suite**

Run: `npm test`
Expected: All test suites PASS (0 failures).

- [ ] **Step 4: Commit Task 5**

```bash
git add src/lib/cp/dpStressTester.ts scripts/stress-test-dp.ts src/lib/cp/__tests__/dpStressTester.test.ts
git commit -m "test(wood-cut): verify optimized heuristic benchmark against DP ground truth"
```
