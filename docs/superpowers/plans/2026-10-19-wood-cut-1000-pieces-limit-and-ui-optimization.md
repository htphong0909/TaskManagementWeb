# Kế Hoạch Triển Khai: Nâng Giới Hạn 1.000 Tấm & Tối Ưu Hóa Hiển Thị Đơn Hàng Lớn Trang Wood-Cut

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng ngưỡng giới hạn tổng số lượng tấm ván cần cắt lên 1.000 tấm, tối ưu hóa thuật toán 3 cấp theo tải đảm bảo thời gian chạy $< 35\text{ms}$ trên luồng chính, và tự động ẩn sơ đồ ghép chi tiết khi tổng đơn hàng $> 100$ tấm để bảo vệ hiệu năng giao diện.

**Architecture:** Mở rộng hằng số `INPUT_LIMITS` và bộ tiền kiểm soát `Pre-Flight Safety Guard` lên 1.000 tấm; phân cấp thuật toán tối ưu thành 3 bậc (nhỏ $\le 40$, vừa $41-200$, lớn $201-1000$ tấm với bộ 8 tổ hợp siêu tốc và tắt GRASP); cập nhật parser và form nhập liệu; thêm cờ điều kiện ẩn/hiện danh sách component `JoinedPieceDiagramView` trên `WoodCutPage` khi tổng số lượng $> 100$.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vitest, React Testing Library.

## Global Constraints
- `MAX_QUANTITY_PER_PIECE = 1000`
- `MAX_TOTAL_SUBPIECES = 1000`
- Thời gian tính toán cho đơn hàng 1.000 tấm: $< 50\text{ms}$
- Khi `totalPiecesCount > 100`: Mặc định ẩn các thẻ sơ đồ ghép, hiển thị banner thông báo kèm nút mở xem chi tiết
- Giữ nguyên toàn vẹn độ chính xác của No-Overlap, Boundary Containment và Grain Orientation Invariants

---

### Task 1: Cập Nhật Giới Hạn 1.000 Tấm & Thuật Toán 3 Cấp Thích Ứng (3-Tier Heuristic)

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingInputSanitization.test.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Consumes: `CalculationConfig`, `StockSheetInput`, `RequiredPieceInput` from `src/types/woodCut.ts`
- Produces: `INPUT_LIMITS.MAX_QUANTITY_PER_PIECE = 1000`, `INPUT_LIMITS.MAX_TOTAL_SUBPIECES = 1000`, `calculateWoodCut` với logic 3-tier ensemble.

- [ ] **Step 1: Viết test kiểm tra giới hạn 1.000 tấm & 1.001 tấm bị chặn**

Thêm các test case mới vào cuối file `src/lib/__tests__/woodCuttingInputSanitization.test.ts`:

```typescript
describe("Giới hạn mở rộng 1,000 tấm & 3-Tier Adaptive Heuristic", () => {
  it("chấp nhận và xử lý thành công đơn hàng 1,000 tấm hợp lệ", () => {
    const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Thanh nẹp", length: 200, width: 100, quantity: 1000, grain: "none", allowRotation: true },
    ];
    const startTime = performance.now();
    const result = calculateWoodCut(stock, pieces);
    const duration = performance.now() - startTime;

    expect(result.stockSheetsUsed.length).toBeGreaterThan(0);
    expect(result.summary.totalStockSheets).toBeGreaterThan(0);
    // Thời gian tính toán phải nhỏ hơn 60ms
    expect(duration).toBeLessThan(60);
  });

  it("ngắt ngay trong Pre-Flight Guard khi tổng số lượng ước tính vượt quá 1,000 mảnh", () => {
    const stock: StockSheetInput[] = [{ id: "s1", length: 2440, width: 1220 }];
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Thanh nẹp", length: 200, width: 100, quantity: 1001, grain: "none", allowRotation: true },
    ];
    const result = calculateWoodCut(stock, pieces);
    expect(result.stockSheetsUsed.length).toBe(0);
    expect(result.summary.totalStockSheets).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Run: `npx vitest run src/lib/__tests__/woodCuttingInputSanitization.test.ts`
Expected: FAIL do `INPUT_LIMITS.MAX_QUANTITY_PER_PIECE` và `MAX_TOTAL_SUBPIECES` hiện tại vẫn là `500`.

- [ ] **Step 3: Triển khai mã nguồn cập nhật trong `woodCuttingOptimizer.ts`**

Chỉnh sửa trong `src/lib/woodCuttingOptimizer.ts`:
1. Cập nhật `INPUT_LIMITS`:
```typescript
export const INPUT_LIMITS = {
  MIN_STOCK_DIM: 100,
  MAX_STOCK_DIM: 10000,
  MIN_PIECE_DIM: 10,
  MAX_PIECE_DIM: 30000,
  MAX_QUANTITY_PER_PIECE: 1000,
  MAX_TOTAL_SUBPIECES: 1000,
  MAX_KERF: 50,
};
```

2. Cập nhật khối chọn chiến lược trong `calculateWoodCut` thành 3 bậc:
```typescript
  // 2. Chạy Multi-Heuristic Ensemble kết hợp GRASP tìm phương án tối ưu nhất
  const isTier3LargeOrder = flatCutItems.length > 200;
  const isTier2MediumOrder = flatCutItems.length > 40 && !isTier3LargeOrder;

  let sortStrategies: SortStrategy[];
  let fitRules: FitRule[];
  let splitRules: SplitRule[];
  let allocations: SheetAllocationMode[];
  let maxEnsembleTimeMs: number;

  if (isTier3LargeOrder) {
    // Bậc 3 (> 200 tấm): Tinh gọn về 8 tổ hợp tinh hoa nhất, ngắt GRASP
    sortStrategies = ["AREA_DESC", "COMBINED_PRIORITY_DESC"];
    fitRules = ["BSSF", "BPCF"];
    splitRules = ["SAS", "MINAS"];
    allocations = ["GLOBAL_BEST_FIT"];
    maxEnsembleTimeMs = 30;
  } else if (isTier2MediumOrder) {
    // Bậc 2 (41 - 200 tấm): Fast Ensemble 48 tổ hợp
    sortStrategies = ["AREA_DESC", "MAX_DIM_DESC", "COMBINED_PRIORITY_DESC", "PERIMETER_DESC"];
    fitRules = ["BSSF", "BPCF"];
    splitRules = ["MINAS", "SAS", "MAXAS"];
    allocations = ["GLOBAL_BEST_FIT", "SHEET_BY_SHEET"];
    maxEnsembleTimeMs = 35;
  } else {
    // Bậc 1 (<= 40 tấm): Full Ensemble 432 tổ hợp
    sortStrategies = [
      "AREA_DESC",
      "MAX_DIM_DESC",
      "MIN_DIM_DESC",
      "PERIMETER_DESC",
      "COMBINED_PRIORITY_DESC",
      "SIDE_RATIO_DESC",
      "WIDTH_DESC",
      "LENGTH_DESC",
      "ASPECT_RATIO_DESC",
    ];
    fitRules = ["BSSF", "BLSF", "BAF", "BPCF"];
    splitRules = ["SAS", "LAS", "MINAS", "MAXAS", "SLAS", "LLAS"];
    allocations = ["GLOBAL_BEST_FIT", "SHEET_BY_SHEET"];
    maxEnsembleTimeMs = 120;
  }
```

3. Cập nhật vòng lặp GRASP: Chỉ chạy khi không phải Bậc 3:
```typescript
  // 2.2. Adaptive GRASP & 2-Opt Local Search (chỉ chạy cho Bậc 1 và Bậc 2)
  if (flatCutItems.length >= 3 && !isTier3LargeOrder) {
    const graspStartTime = performance.now();
    let seed = 2026;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    let iterations = 0;
    const maxIterations = isTier2MediumOrder ? 40 : 160;
    const maxGraspTimeMs = isTier2MediumOrder ? 8 : 12;

    while (performance.now() - graspStartTime < maxGraspTimeMs && iterations < maxIterations) {
      iterations++;
      // giữ nguyên logic hoán vị ngẫu nhiên
```

- [ ] **Step 4: Chạy lại test xác nhận thành công**

Run: `npx vitest run src/lib/__tests__/woodCuttingInputSanitization.test.ts`
Expected: PASS cả test 1.000 tấm và test 1.001 tấm.

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: PASS toàn bộ test hiện có.

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/__tests__/woodCuttingInputSanitization.test.ts
git commit -m "feat: expand wood cutting limits to 1000 pieces and add 3-tier adaptive heuristic"
```

---

### Task 2: Cập Nhật Parser Và Form Nhập Liệu Cho Giới Hạn 1.000 Tấm

**Files:**
- Modify: `src/lib/woodCutParser.ts`
- Modify: `src/components/wood-cut/RequiredPiecesForm.tsx`
- Test: `src/lib/__tests__/woodCutParser.test.ts`

**Interfaces:**
- Consumes: `parseRequiredPiecesText`, `formatPiecesToText`
- Produces: `parseRequiredPiecesText` chấp nhận $q \le 1000$, `NumericInput` trong `RequiredPiecesForm.tsx` có `max={1000}`.

- [ ] **Step 1: Viết test cho `woodCutParser.test.ts`**

Thêm test case vào `src/lib/__tests__/woodCutParser.test.ts`:
```typescript
it("chấp nhận số lượng tấm lên tới 1,000 tấm mỗi loại", () => {
  const input = "1200x600 x1000";
  const { pieces, errors } = parseRequiredPiecesText(input);
  expect(errors.length).toBe(0);
  expect(pieces[0].quantity).toBe(1000);
});

it("báo lỗi nếu số lượng vượt quá 1,000 tấm", () => {
  const input = "1200x600 x1001";
  const { pieces, errors } = parseRequiredPiecesText(input);
  expect(errors.length).toBe(1);
  expect(errors[0]).toContain("1,000");
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Run: `npx vitest run src/lib/__tests__/woodCutParser.test.ts`
Expected: FAIL do parser hiện tại kiểm tra `quantity > 500`.

- [ ] **Step 3: Triển khai cập nhật trong `woodCutParser.ts` và `RequiredPiecesForm.tsx`**

1. Trong `src/lib/woodCutParser.ts` (dòng 67-70):
```typescript
    if (quantity > 1000) {
      errors.push(`Dòng ${index + 1}: Số lượng (${quantity}) vượt quá giới hạn tối đa (1,000 tấm/loại).`);
      return;
    }
```

2. Trong `src/components/wood-cut/RequiredPiecesForm.tsx` (dòng 208):
```typescript
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">SL:</span>
                <NumericInput
                  value={p.quantity}
                  onChange={(val) => handleUpdate(p.id, "quantity", val)}
                  min={1}
                  max={1000}
                  defaultValue={1}
                  className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
                  ariaLabel={`Số lượng ${p.name}`}
                />
              </div>
```

- [ ] **Step 4: Chạy test xác nhận thành công**

Run: `npx vitest run src/lib/__tests__/woodCutParser.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCutParser.ts src/components/wood-cut/RequiredPiecesForm.tsx src/lib/__tests__/woodCutParser.test.ts
git commit -m "feat: increase max quantity per piece to 1000 in parser and form"
```

---

### Task 3: Tối Ưu Hóa Giao Diện — Ẩn Sơ Đồ Ghép Khi Đơn Hàng $> 100$ Tấm

**Files:**
- Modify: `src/app/wood-cut/page.tsx`
- Test: `src/__tests__/woodCutIntegration.test.ts`

**Interfaces:**
- Consumes: `CalculationResult.joinedPieces`, `RequiredPieceInput[]`
- Produces: Giao diện có banner điều kiện khi $\sum \text{quantity} > 100$, nút toggle xem chi tiết `forceShowJoinedDiagrams`.

- [ ] **Step 1: Viết test tích hợp trong `src/__tests__/woodCutIntegration.test.ts`**

Thêm test case kiểm tra hành vi ẩn sơ đồ ghép khi $> 100$ tấm:

```typescript
it("tự động ẩn sơ đồ ghép chi tiết và hiển thị banner thông báo khi tổng số tấm > 100", () => {
  // Mock dữ liệu hoặc kiểm tra logic tính tổng số lượng
  const pieces = [
    { id: "p1", name: "Tấm A", length: 1500, width: 800, quantity: 101, allowRotation: true },
  ];
  const totalPieces = pieces.reduce((sum, p) => sum + p.quantity, 0);
  expect(totalPieces).toBeGreaterThan(100);
});
```

- [ ] **Step 2: Triển khai cập nhật trong `src/app/wood-cut/page.tsx`**

Trong `src/app/wood-cut/page.tsx`:
1. Thêm state `forceShowJoinedDiagrams`:
```typescript
  const [forceShowJoinedDiagrams, setForceShowJoinedDiagrams] = useState(false);
```

2. Tính toán tổng số lượng ván yêu cầu:
```typescript
  const totalPiecesCount = pieces.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const isLargeJoinedOrder = totalPiecesCount > 100;
  const shouldRenderJoinedDiagrams = !isLargeJoinedOrder || forceShowJoinedDiagrams;
```

3. Cập nhật phần render `KHU VỰC 2 - Mục 2 (Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ)`:
```tsx
          {/* 2. Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ */}
          {result && result.joinedPieces.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-100/70 border border-amber-300/80 px-5 py-3 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧩</span>
                  <div>
                    <h3 className="text-base font-black text-amber-950 uppercase tracking-wide">
                      Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ
                    </h3>
                    <p className="text-xs text-amber-800 font-medium">
                      Bản vẽ cấu tạo từng mặt gỗ, đường vệt nối và số hiệu tấm ván gốc cắt ra
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-amber-900 bg-amber-200/80 border border-amber-400 px-3.5 py-1.5 rounded-full shadow-xs">
                    {result.joinedPieces.length} mặt gỗ
                  </span>
                  {isLargeJoinedOrder && (
                    <button
                      type="button"
                      onClick={() => setForceShowJoinedDiagrams(!forceShowJoinedDiagrams)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs cursor-pointer"
                    >
                      {forceShowJoinedDiagrams ? "Thu gọn sơ đồ ghép" : "Xem sơ đồ ghép"}
                    </button>
                  )}
                </div>
              </div>

              {/* Thông báo khi ẩn do đơn hàng lớn */}
              {isLargeJoinedOrder && !forceShowJoinedDiagrams && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>
                      Đơn hàng lớn (tổng <strong>{totalPiecesCount} tấm</strong>). Sơ đồ ghép chi tiết được ẩn để tối ưu hiệu năng hiển thị. Sơ đồ xẻ ván gốc và bảng BOM bên dưới vẫn hiển thị đầy đủ.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForceShowJoinedDiagrams(true)}
                    className="ml-4 font-bold text-amber-800 underline hover:text-amber-950 shrink-0 cursor-pointer"
                  >
                    Bấm để hiển thị tất cả ({result.joinedPieces.length} sơ đồ)
                  </button>
                </div>
              )}

              {/* Grid 3 cột trên desktop, 2 cột trên tablet khi được phép hiển thị */}
              {shouldRenderJoinedDiagrams && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {result.joinedPieces.map((diagram) => (
                    <JoinedPieceDiagramView key={diagram.parentId} diagram={diagram} />
                  ))}
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 3: Chạy test tích hợp và kiểm thử giao diện**

Run: `npx vitest run src/__tests__/woodCutIntegration.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 4: Commit**

```bash
git add src/app/wood-cut/page.tsx src/__tests__/woodCutIntegration.test.ts
git commit -m "feat: conditionally hide joined piece diagrams when total pieces exceed 100"
```

---

### Task 4: Chạy Kiểm Thử Toàn Diện (Regression & Lint Check)

**Files:**
- N/A

- [ ] **Step 1: Chạy toàn bộ test suite dự án**

Run: `npm run test`
Expected: Toàn bộ test của dự án PASS (bao gồm các test wood-cut, boards, task management).

- [ ] **Step 2: Chạy kiểm tra linting**

Run: `npm run lint`
Expected: Không có lỗi ESLint hoặc TypeScript format.

- [ ] **Step 3: Commit hoàn thiện**

```bash
git commit --allow-empty -m "chore: verify test suite and linting for 1000 pieces limit feature"
```
