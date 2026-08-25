# Input Constraints & Pre-Flight Safety Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết lập Ma Trận Giới Hạn Đầu Vào (Input Constraints Matrix) chuẩn hóa cho toàn bộ các form nhập liệu, xây dựng cơ chế Pre-Flight Safety Guard 0.001ms chống treo trình duyệt khi người dùng nhập dữ liệu ngoại lai ($10^9\text{mm}$, số âm, số lượng cực lớn), và hoàn thiện bộ kiểm thử biên dữ liệu.

**Architecture:**
1. **Pre-Flight Safety Guard (`woodCuttingOptimizer.ts`)**: Tiền kiểm tra nhanh 0.001ms, chặn đứng mọi dữ liệu $> 30,000\text{mm}$ hoặc ước tính $> 500$ mảnh con.
2. **Batch Parser Sanitizer (`woodCutParser.ts`)**: Bắt lỗi cú pháp và cảnh báo số vượt giới hạn chi tiết theo từng dòng khi paste hàng loạt.
3. **UI Constraints (`NumericInput.tsx`, `StockSheetForm.tsx`, `RequiredPiecesForm.tsx`)**: Giới hạn `min` / `max` trên tất cả các trường nhập liệu.
4. **Stress Outlier Tests (`woodCuttingInputSanitization.test.ts`)**: Kiểm chứng 100% các ca ngoại lai ($10^9$, số âm, $q=100,000$).

**Tech Stack:** TypeScript, Next.js 16, React 19, Vitest.

---

### Task 1: Pre-Flight Safety Guard & Parser Sanitization

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Modify: `src/lib/woodCutParser.ts`
- Test: `src/lib/__tests__/woodCutParser.test.ts`

- [ ] **Step 1: Update `src/lib/woodCutParser.ts` to validate number bounds**

In `parseRequiredPiecesText`:
```typescript
const MAX_DIMENSION = 30000;
const MAX_QUANTITY = 500;

if (length <= 0 || width <= 0) {
  errors.push(`Dòng ${lineIdx + 1}: Kích thước phải lớn hơn 0mm.`);
  continue;
}
if (length > MAX_DIMENSION || width > MAX_DIMENSION) {
  errors.push(`Dòng ${lineIdx + 1}: Kích thước (${length}x${width}mm) vượt quá giới hạn tối đa (${MAX_DIMENSION}mm).`);
  continue;
}
if (quantity <= 0 || quantity > MAX_QUANTITY) {
  errors.push(`Dòng ${lineIdx + 1}: Số lượng (${quantity}) phải từ 1 đến ${MAX_QUANTITY}.`);
  continue;
}
```

- [ ] **Step 2: Update `src/lib/woodCuttingOptimizer.ts` with Pre-Flight Safety Guard**

Add input validation and pre-flight estimation in `calculateWoodCut`:
```typescript
export const INPUT_LIMITS = {
  MIN_STOCK_DIM: 100,
  MAX_STOCK_DIM: 10000,
  MIN_PIECE_DIM: 10,
  MAX_PIECE_DIM: 30000,
  MAX_QUANTITY_PER_PIECE: 500,
  MAX_TOTAL_SUBPIECES: 500,
  MAX_KERF: 50,
};
```
If inputs exceed safety limits or estimated subpieces $> 500$, immediately return safe empty result.

- [ ] **Step 3: Run parser tests**

Run: `npx vitest run src/lib/__tests__/woodCutParser.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/woodCutParser.ts src/lib/__tests__/woodCutParser.test.ts
git commit -m "feat(wood-cut): implement pre-flight safety guard and parser input bounds"
```

---

### Task 2: UI Input Constraints in Form Components

**Files:**
- Modify: `src/components/wood-cut/NumericInput.tsx`
- Modify: `src/components/wood-cut/StockSheetForm.tsx`
- Modify: `src/components/wood-cut/RequiredPiecesForm.tsx`

- [ ] **Step 1: Update `NumericInput.tsx`**

Ensure `NumericInput` strictly enforces `min` and `max` clamping both on keystroke and on blur:
- If typed value exceeds `max`, clamp to `max`.
- If typed value is below `min` on blur, fallback to `defaultValue` or `min`.

- [ ] **Step 2: Update `StockSheetForm.tsx`**

Set:
- Length: `min={100}`, `max={10000}`
- Width: `min={100}`, `max={10000}`
- Kerf: `min={0}`, `max={50}`

- [ ] **Step 3: Update `RequiredPiecesForm.tsx`**

Set:
- Length: `min={10}`, `max={30000}`
- Width: `min={10}`, `max={30000}`
- Quantity: `min={1}`, `max={500}`
- Max piece rows limit = 100.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/components/wood-cut/NumericInput.tsx src/components/wood-cut/StockSheetForm.tsx src/components/wood-cut/RequiredPiecesForm.tsx
git commit -m "feat(wood-cut): add strict min and max bounds to UI form inputs"
```

---

### Task 3: Extreme Boundary & Outlier Unit Tests & Full Project Verification

**Files:**
- Create: `src/lib/__tests__/woodCuttingInputSanitization.test.ts`

- [ ] **Step 1: Write `src/lib/__tests__/woodCuttingInputSanitization.test.ts`**

Test scenarios:
1. `1e9` mm dimension rejected instantly by pre-flight in $< 1\text{ms}$.
2. Negative dimensions ($-500\text{mm}$) and 0mm filtered out safely.
3. Quantity $q = 100,000$ stopped by subpiece safety limit.
4. Batch parser captures out-of-bound dimensions and formats readable error list.
5. Upper valid bound ($30,000\text{mm}$) processes smoothly.

- [ ] **Step 2: Run new test suite**

Run: `npx vitest run src/lib/__tests__/woodCuttingInputSanitization.test.ts`
Expected: PASS.

- [ ] **Step 3: Run full project test suite**

Run: `npm test`
Expected: All 22 test files PASS (100% pass rate).

- [ ] **Step 4: Commit Task 3 & Push to `origin/dev`**

```bash
git add src/lib/__tests__/woodCuttingInputSanitization.test.ts
git commit -m "test(wood-cut): add comprehensive input bounds and outlier sanitization tests"
git push origin dev
```
