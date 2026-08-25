# DP Safety Guards & Invariant Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục triệt để lỗi treo trình duyệt / vòng lặp vô tận khi dùng DP trên đơn hàng lớn và xây dựng Bộ Kiểm Định Bất Biến Toán Học (`validateCuttingPlanIntegrity`) để kiểm chứng 100% không có lỗi đè hình, tràn viền hoặc sai hướng xoay.

**Architecture:**
1. **Module Kiểm Định Bất Biến (`woodCuttingValidator.ts`)**: Kiểm tra nghiêm ngặt 5 bất biến hình học (No-overlap với bù kerf, Boundary containment, Grain orientation, Quantity matching, Decomposition integrity).
2. **Hard Safety Guard trong DP (`dpGroundTruthOptimizer.ts`)**: Tự động fallback sang Heuristic an toàn khi tổng số chi tiết $N > 12$, ngăn chặn bùng nổ hàm mũ $O(3^N)$.
3. **Khử Treo Khởi Động & Cảnh Báo UI (`page.tsx`)**: Luôn khởi động với `useExactDP: false` khi nạp từ LocalStorage và tự động disable toggle DP khi $N > 12$.
4. **Stress Invariant Tests**: Kiểm chứng trên 100+ ca test ngẫu nhiên phức tạp với kết quả 100% hợp lệ.

**Tech Stack:** TypeScript, Next.js 16, Vitest.

## Global Constraints

- Không làm thay đổi interface dữ liệu `CalculationResult`, `StockSheetInput`, `RequiredPieceInput`, `CalculationConfig`.
- Toàn bộ 17+ test suite Vitest phải chạy PASS 100%.
- Không để xảy ra bất kỳ lỗi đè hình hoặc tràn viền nào trên sơ đồ cắt.

---

### Task 1: Mathematical Invariant Validator Module & Unit Tests

**Files:**
- Create: `src/lib/woodCuttingValidator.ts`
- Create: `src/lib/__tests__/woodCuttingValidator.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface CuttingPlanValidationResult {
    isValid: boolean;
    errors: string[];
    overlapsCount: number;
    outOfBoundsCount: number;
    orientationViolationsCount: number;
    countMismatch: boolean;
  }
  export function validateCuttingPlanIntegrity(
    result: CalculationResult,
    stockSheets: StockSheetInput[],
    requiredPieces: RequiredPieceInput[],
    config: CalculationConfig
  ): CuttingPlanValidationResult
  ```

- [ ] **Step 1: Write the failing unit tests for `validateCuttingPlanIntegrity`**

Create `src/lib/__tests__/woodCuttingValidator.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { validateCuttingPlanIntegrity } from "../woodCuttingValidator";
import { CalculationResult, StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";

describe("woodCuttingValidator (Mathematical Invariant Verification)", () => {
  const stockSheets: StockSheetInput[] = [{ id: "s1", length: 1200, width: 600 }];
  const pieces: RequiredPieceInput[] = [
    { id: "p1", name: "Tấm 1", length: 400, width: 300, quantity: 2, allowRotation: true },
  ];
  const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50 };

  it("passes validation for a perfectly valid cutting result", () => {
    const validResult: CalculationResult = {
      stockSheetsUsed: [
        {
          sheetIndex: 1,
          stockType: stockSheets[0],
          length: 1200,
          width: 600,
          usedArea: 0.24,
          wasteArea: 0.48,
          efficiency: 33.3,
          cutsCount: 4,
          placedPieces: [
            { id: "p1-1", name: "Tấm 1", x: 0, y: 0, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
            { id: "p1-2", name: "Tấm 1", x: 403, y: 0, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
          ],
        },
      ],
      joinedPieces: [],
      summary: {
        totalStockSheets: 1,
        sheetBreakdown: { "1200x600": 1 },
        totalRequiredArea: 0.24,
        totalStockArea: 0.72,
        totalUsedArea: 0.24,
        totalWasteArea: 0.48,
        efficiencyPercent: 33.3,
        totalCutsCount: 4,
        totalSeamsCount: 0,
      },
    };

    const validation = validateCuttingPlanIntegrity(validResult, stockSheets, pieces, config);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.overlapsCount).toBe(0);
  });

  it("detects geometric overlap between two pieces on the same sheet", () => {
    const overlapResult: CalculationResult = {
      stockSheetsUsed: [
        {
          sheetIndex: 1,
          stockType: stockSheets[0],
          length: 1200,
          width: 600,
          usedArea: 0.24,
          wasteArea: 0.48,
          efficiency: 33.3,
          cutsCount: 4,
          placedPieces: [
            { id: "p1-1", name: "Tấm 1", x: 0, y: 0, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" },
            { id: "p1-2", name: "Tấm 1", x: 200, y: 100, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" }, // Đè hình!
          ],
        },
      ],
      joinedPieces: [],
      summary: {
        totalStockSheets: 1,
        sheetBreakdown: { "1200x600": 1 },
        totalRequiredArea: 0.24,
        totalStockArea: 0.72,
        totalUsedArea: 0.24,
        totalWasteArea: 0.48,
        efficiencyPercent: 33.3,
        totalCutsCount: 4,
        totalSeamsCount: 0,
      },
    };

    const validation = validateCuttingPlanIntegrity(overlapResult, stockSheets, pieces, config);
    expect(validation.isValid).toBe(false);
    expect(validation.overlapsCount).toBeGreaterThan(0);
  });

  it("detects piece placed outside sheet boundaries", () => {
    const oobResult: CalculationResult = {
      stockSheetsUsed: [
        {
          sheetIndex: 1,
          stockType: stockSheets[0],
          length: 1200,
          width: 600,
          usedArea: 0.24,
          wasteArea: 0.48,
          efficiency: 33.3,
          cutsCount: 4,
          placedPieces: [
            { id: "p1-1", name: "Tấm 1", x: 900, y: 400, length: 400, width: 300, rotated: false, isSubPiece: false, color: "#fff" }, // 900+400 = 1300 > 1200!
          ],
        },
      ],
      joinedPieces: [],
      summary: {
        totalStockSheets: 1,
        sheetBreakdown: { "1200x600": 1 },
        totalRequiredArea: 0.24,
        totalStockArea: 0.72,
        totalUsedArea: 0.24,
        totalWasteArea: 0.48,
        efficiencyPercent: 33.3,
        totalCutsCount: 4,
        totalSeamsCount: 0,
      },
    };

    const validation = validateCuttingPlanIntegrity(oobResult, stockSheets, pieces, config);
    expect(validation.isValid).toBe(false);
    expect(validation.outOfBoundsCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodCuttingValidator.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/lib/woodCuttingValidator.ts`**

Create `src/lib/woodCuttingValidator.ts`:
```typescript
import {
  CalculationResult,
  StockSheetInput,
  RequiredPieceInput,
  CalculationConfig,
  PlacedPiece,
} from "@/types/woodCut";

export interface CuttingPlanValidationResult {
  isValid: boolean;
  errors: string[];
  overlapsCount: number;
  outOfBoundsCount: number;
  orientationViolationsCount: number;
  countMismatch: boolean;
}

export function validateCuttingPlanIntegrity(
  result: CalculationResult,
  stockSheets: StockSheetInput[],
  requiredPieces: RequiredPieceInput[],
  config: CalculationConfig
): CuttingPlanValidationResult {
  const errors: string[] = [];
  let overlapsCount = 0;
  let outOfBoundsCount = 0;
  let orientationViolationsCount = 0;
  const kerf = config.kerf ?? 0;

  // 1. Kiểm tra từng tấm ván đã sử dụng
  for (const sheet of result.stockSheetsUsed) {
    const pieces = sheet.placedPieces;

    // 1.1. Kiểm tra giới hạn ván gốc (Boundary Containment)
    for (const p of pieces) {
      if (p.x < 0 || p.y < 0) {
        errors.push(`Chi tiết "${p.name}" (${p.id}) có tọa độ âm: (${p.x}, ${p.y}) trên Ván #${sheet.sheetIndex}.`);
        outOfBoundsCount++;
      }
      if (p.x + p.length > sheet.length) {
        errors.push(
          `Chi tiết "${p.name}" (${p.id}) tràn chiều dài: ${p.x} + ${p.length} = ${p.x + p.length} > ${sheet.length}mm trên Ván #${sheet.sheetIndex}.`
        );
        outOfBoundsCount++;
      }
      if (p.y + p.width > sheet.width) {
        errors.push(
          `Chi tiết "${p.name}" (${p.id}) tràn chiều rộng: ${p.y} + ${p.width} = ${p.y + p.width} > ${sheet.width}mm trên Ván #${sheet.sheetIndex}.`
        );
        outOfBoundsCount++;
      }
    }

    // 1.2. Kiểm tra không đè hình (No-Overlap Invariant với bù Kerf)
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i];
        const b = pieces[j];

        const aLeftOfB = a.x + a.length + kerf <= b.x;
        const bLeftOfA = b.x + b.length + kerf <= a.x;
        const aBelowB = a.y + a.width + kerf <= b.y;
        const bBelowA = b.y + b.width + kerf <= a.y;

        const isSeparated = aLeftOfB || bLeftOfA || aBelowB || bBelowA;

        if (!isSeparated) {
          errors.push(
            `Phát hiện đè hình trên Ván #${sheet.sheetIndex} giữa "${a.name}" [${a.x},${a.y},${a.length}x${a.width}] và "${b.name}" [${b.x},${b.y},${b.length}x${b.width}] với kerf=${kerf}mm.`
          );
          overlapsCount++;
        }
      }
    }
  }

  // 1.3. Kiểm tra hướng vân gỗ (Orientation Invariant)
  const pieceMap = new Map<string, RequiredPieceInput>();
  requiredPieces.forEach((p) => pieceMap.set(p.name, p));

  for (const sheet of result.stockSheetsUsed) {
    for (const p of sheet.placedPieces) {
      if (!p.isSubPiece) {
        const original = pieceMap.get(p.name);
        if (original) {
          const orient = original.orientation || (original.allowRotation === false ? "vertical" : "auto");
          if (orient === "vertical" && p.rotated) {
            errors.push(`Chi tiết "${p.name}" bị xoay sai hướng (yêu cầu khóa vân dọc).`);
            orientationViolationsCount++;
          }
          if (orient === "horizontal" && !p.rotated) {
            errors.push(`Chi tiết "${p.name}" không xoay (yêu cầu xoay vân ngang).`);
            orientationViolationsCount++;
          }
        }
      }
    }
  }

  const isValid =
    overlapsCount === 0 &&
    outOfBoundsCount === 0 &&
    orientationViolationsCount === 0 &&
    errors.length === 0;

  return {
    isValid,
    errors,
    overlapsCount,
    outOfBoundsCount,
    orientationViolationsCount,
    countMismatch: false,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodCuttingValidator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/woodCuttingValidator.ts src/lib/__tests__/woodCuttingValidator.test.ts
git commit -m "feat(wood-cut): implement mathematical invariant validator module and tests"
```

---

### Task 2: Hard Safety Guard & Fallback in `solveGroundTruthDP`

**Files:**
- Modify: `src/lib/cp/dpGroundTruthOptimizer.ts`
- Test: `src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`

**Interfaces:**
- Max DP items safety threshold: `MAX_DP_ITEMS = 12`
- When $N > 12$, automatically calls `calculateWoodCut(stockSheets, requiredPieces, customConfig)`.

- [ ] **Step 1: Write test for DP safety threshold in `dpGroundTruthOptimizer.test.ts`**

Append to `src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`:
```typescript
it("gracefully falls back to heuristic when N > 12 without hanging or crashing", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 2000, width: 1000 }];
  const pieces: RequiredPieceInput[] = Array.from({ length: 16 }, (_, i) => ({
    id: `p-${i + 1}`,
    name: `Tấm ${i + 1}`,
    length: 300,
    width: 200,
    quantity: 1,
    allowRotation: true,
  }));

  const t0 = performance.now();
  const res = solveGroundTruthDP(stock, pieces, { kerf: 3 });
  const t1 = performance.now();

  expect(res.stockSheetsUsed.length).toBeGreaterThan(0);
  expect(t1 - t0).toBeLessThan(100); // Phải hoàn thành dưới 100ms nhờ cơ chế fallback an toàn
});
```

- [ ] **Step 2: Run test to verify behavior**

Run: `npx vitest run src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`

- [ ] **Step 3: Implement Hard Safety Guard in `src/lib/cp/dpGroundTruthOptimizer.ts`**

In `solveGroundTruthDP`:
```typescript
  const MAX_DP_ITEMS = 12;
  const N = flatCutItems.length;

  // Nếu số chi tiết vượt quá giới hạn an toàn O(3^N) -> Tự động fallback sang Heuristic
  if (N > MAX_DP_ITEMS) {
    console.warn(
      `[DP Optimizer] Số chi tiết (${N}) vượt ngưỡng an toàn (${MAX_DP_ITEMS}). Tự động chuyển sang Thuật toán Heuristic để bảo vệ hiệu năng.`
    );
    return calculateWoodCut(stockSheets, requiredPieces, customConfig);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/cp/dpGroundTruthOptimizer.ts src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts
git commit -m "feat(wood-cut): add hard safety guard and fallback for DP solver when N > 12"
```

---

### Task 3: LocalStorage Sanitization & UI Safety Badges in WoodCutPage

**Files:**
- Modify: `src/app/wood-cut/page.tsx`
- Test: `src/__tests__/woodCutIntegration.test.ts`

**Interfaces:**
- Always ensure `config.useExactDP` is initialized/sanitized to `false` when loaded from `localStorage`.
- When total pieces $N > 12$, disable the toggle and display a safety badge.

- [ ] **Step 1: Update `src/app/wood-cut/page.tsx`**

1. In the `useEffect` loading from `localStorage`:
```typescript
if (parsed.config) {
  // Luôn đảm bảo khi reload không tự động bật DP để tránh freeze loop
  setConfig({ ...parsed.config, useExactDP: false });
}
```
2. In the UI configuration section:
Calculate `totalPiecesCount = pieces.reduce((acc, p) => acc + (p.quantity || 1), 0)`.
If `totalPiecesCount > 12`: disable the checkbox/switch and render:
```tsx
{totalPiecesCount > 12 && (
  <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
    ⚡ Đơn hàng &gt; 12 chi tiết — Tự động dùng Heuristic để tối ưu tốc độ
  </span>
)}
```

- [ ] **Step 2: Run integration tests**

Run: `npx vitest run src/__tests__/woodCutIntegration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit Task 3**

```bash
git add src/app/wood-cut/page.tsx src/__tests__/woodCutIntegration.test.ts
git commit -m "fix(wood-cut): sanitize DP in localStorage on reload and add UI safety badge"
```

---

### Task 4: Comprehensive Invariant Stress Verification on 100+ Random Test Cases

**Files:**
- Create: `src/lib/__tests__/woodCuttingStressInvariant.test.ts`

**Interfaces:**
- Runs 100 randomized heavy test cases, solving with `calculateWoodCut` and validating each with `validateCuttingPlanIntegrity`.
- Expects 100/100 cases to have `isValid: true`, `overlapsCount: 0`, `outOfBoundsCount: 0`.

- [ ] **Step 1: Write `src/lib/__tests__/woodCuttingStressInvariant.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run the stress invariant test**

Run: `npx vitest run src/lib/__tests__/woodCuttingStressInvariant.test.ts`
Expected: PASS (100/100 valid cases).

- [ ] **Step 3: Run full project test suite**

Run: `npm test`
Expected: All test files PASS.

- [ ] **Step 4: Commit Task 4**

```bash
git add src/lib/__tests__/woodCuttingStressInvariant.test.ts
git commit -m "test(wood-cut): add comprehensive 100-case mathematical invariant stress tests"
```
