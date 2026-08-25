# Grain Orientation Standardization & Dual DP Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa quy tắc vân gỗ theo đúng tiêu chuẩn ngành mộc CNC (mặt gỗ luôn giữ nguyên kích thước danh định ban đầu, chỉ xoay hướng khi cắt trên ván gốc), hiển thị nhãn vân gỗ trực quan và xây dựng bộ kiểm thử đối soát song song 100% với DP Ground Truth trên các test nhỏ.

**Architecture:**
1. **Bảo Toàn Kích Thước Mặt Gỗ (`woodDecomposer.ts`)**: `targetLength` & `targetWidth` của sơ đồ ghép luôn là $pL \times pW$, kiểm tra `canFitInStock` theo hướng vân ván gốc.
2. **Cơ Chế Xếp Ván Đúng Chiều Vân (`woodCuttingOptimizer.ts` & `dpGroundTruthOptimizer.ts`)**: `"vertical"` $\rightarrow$ `rotated: false` ($L \times W$), `"horizontal"` $\rightarrow$ `rotated: true` ($W \times L$), `"auto"` $\rightarrow$ tối ưu tự do.
3. **Hiển Thị Trực Quan (`CuttingDiagram.tsx`)**: Hiển thị kích thước cắt thực tế kèm nhãn `Dọc vân` / `⟲ Ngang vân (Xoay 90°)`.
4. **Dual DP Co-Testing (`woodCuttingGrainDPOptimal.test.ts`)**: Chạy đối soát song song giữa Heuristic và DP Ground Truth trên 50 ca kiểm thử nhỏ có khóa vân gỗ.

**Tech Stack:** TypeScript, Next.js 16, React 19, Vitest.

---

### Task 1: Standardize Grain Orientation in `woodDecomposer.ts`

**Files:**
- Modify: `src/lib/woodDecomposer.ts`
- Test: `src/lib/__tests__/woodDecomposer.test.ts`

- [ ] **Step 1: Write unit test for grain orientation preservation in `woodDecomposer.test.ts`**

Add tests verifying that `orientation: "horizontal"` preserves `targetLength = 1000, targetWidth = 400` on the diagram:
```typescript
it("preserves original dimensions (targetLength x targetWidth) for horizontal orientation", () => {
  const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];
  const pieces: RequiredPieceInput[] = [
    { id: "p1", name: "Mặt Ngang", length: 1000, width: 400, quantity: 1, orientation: "horizontal", allowRotation: false }
  ];

  const result = decomposeOversizedPieces(pieces, stock, { kerf: 3, minSubPieceSize: 50 });
  expect(result.joinedDiagrams).toHaveLength(1);
  expect(result.joinedDiagrams[0].targetLength).toBe(1000);
  expect(result.joinedDiagrams[0].targetWidth).toBe(400);
  expect(result.flatCutItems[0].orientation).toBe("horizontal");
});
```

- [ ] **Step 2: Update `src/lib/woodDecomposer.ts`**

In `findOptimalDecomposition`:
- Always preserve `targetL: pL, targetW: pW` for all candidates.
- In `canFitInStock(l, w, stockSheets, orientation)`:
  - `orientation === "vertical"`: `l <= s.length && w <= s.width`
  - `orientation === "horizontal"`: `w <= s.length && l <= s.width` (tức là khi xoay 90° thì chiều dài $l$ của chi tiết vừa với chiều rộng của ván $s.width$).
  - `orientation === "auto"`: `(l <= s.length && w <= s.width) || (w <= s.length && l <= s.width)`.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/woodDecomposer.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/lib/woodDecomposer.ts src/lib/__tests__/woodDecomposer.test.ts
git commit -m "feat(wood-cut): standardize grain orientation and preserve original dimensions in woodDecomposer"
```

---

### Task 2: Standardize Placement Engine & Visual Diagrams in `woodCuttingOptimizer.ts`, `dpGroundTruthOptimizer.ts` & `CuttingDiagram.tsx`

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Modify: `src/lib/cp/dpGroundTruthOptimizer.ts`
- Modify: `src/components/wood-cut/CuttingDiagram.tsx`

- [ ] **Step 1: Update placement rules in `src/lib/woodCuttingOptimizer.ts`**

In `packCandidate`:
```typescript
const orient = item.orientation || (item.allowRotation === false ? "vertical" : "auto");
const tryNormal = orient === "vertical" || orient === "auto";
const tryRotated = orient === "horizontal" || orient === "auto";
```
When placed on sheet:
If `bestRotated === true`:
- `placedPiece.length = item.width` (chiều X trên ván)
- `placedPiece.width = item.length` (chiều Y trên ván)
- `placedPiece.rotated = true`
If `bestRotated === false`:
- `placedPiece.length = item.length`
- `placedPiece.width = item.width`
- `placedPiece.rotated = false`

- [ ] **Step 2: Update DP solver placement in `src/lib/cp/dpGroundTruthOptimizer.ts`**

Ensure `tryFitSingleSheetGuillotine` applies the identical placement mapping:
- `orient === "vertical"` $\rightarrow$ only normal placement (`rotated: false`).
- `orient === "horizontal"` $\rightarrow$ only rotated placement (`rotated: true`).
- `orient === "auto"` $\rightarrow$ allow both.

- [ ] **Step 3: Update `src/components/wood-cut/CuttingDiagram.tsx`**

Render visual grain direction badges on placed pieces:
- If `piece.rotated`: Render `⟲ Ngang vân (Xoay 90°)` with dimensions `${piece.length} × ${piece.width} mm`.
- If `!piece.rotated`: Render `Dọc vân` with dimensions `${piece.length} × ${piece.width} mm`.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/cp/dpGroundTruthOptimizer.ts src/components/wood-cut/CuttingDiagram.tsx
git commit -m "feat(wood-cut): implement strict grain placement in optimizer and visual grain labels in CuttingDiagram"
```

---

### Task 3: Dual Co-Testing with Exact DP Ground Truth & Full Project Verification

**Files:**
- Create: `src/lib/__tests__/woodCuttingGrainDPOptimal.test.ts`

- [ ] **Step 1: Implement `woodCuttingGrainDPOptimal.test.ts`**

1. Test switching interaction on $1000 \times 400$ on $2440 \times 1220$:
   - `vertical`: placed $1000 \times 400$, `rotated = false`.
   - `horizontal`: placed $400 \times 1000$, `rotated = true`.
   - Both produce `joinedDiagram.targetLength = 1000, targetWidth = 400`.
2. Run 50 small cases ($N \le 10$) with mixed grain orientations:
   - Run both `solveGroundTruthDP` and `calculateWoodCut`.
   - Verify 100% strict grain orientation compliance.
   - Verify Heuristic optimal match rate $\ge 98\%$.

- [ ] **Step 2: Run test suite**

Run: `npx vitest run src/lib/__tests__/woodCuttingGrainDPOptimal.test.ts`
Expected: PASS.

- [ ] **Step 3: Run full project test suite**

Run: `npm test`
Expected: All 21 test files PASS (100% pass rate).

- [ ] **Step 4: Commit Task 3 & Push to `origin/dev`**

```bash
git add src/lib/__tests__/woodCuttingGrainDPOptimal.test.ts
git commit -m "test(wood-cut): add dual DP co-testing for grain orientation and optimal efficiency"
git push origin dev
```
