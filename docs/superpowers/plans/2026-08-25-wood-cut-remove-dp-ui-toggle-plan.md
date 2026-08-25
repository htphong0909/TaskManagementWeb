# Remove DP UI Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gỡ bỏ hoàn toàn checkbox "🎯 Chuẩn 100% (DP)" và các badge DP trên giao diện người dùng, đồng thời tinh gọn luồng tính toán trong `src/app/wood-cut/page.tsx` để luôn sử dụng trực tiếp động cơ Heuristic tối ưu.

**Architecture:**
1. **Tinh gọn Giao diện (`StockSheetForm.tsx`)**: Xóa bỏ checkbox DP, badge trạng thái và prop `totalPiecesCount`.
2. **Đơn giản hóa State & Pipeline (`page.tsx`)**: Gỡ bỏ import `solveGroundTruthDP`, xóa logic kiểm tra DP, gọi trực tiếp `calculateWoodCut`.
3. **Bảo toàn Test Suite**: Giữ nguyên module `src/lib/cp/` để chạy benchmark nội bộ.

**Tech Stack:** TypeScript, Next.js 16, React 19, Vitest.

## Global Constraints

- Không ảnh hưởng đến các tính toán cắt ghép ván hiện tại.
- Tất cả 19 test suite phải tiếp tục chạy PASS 100%.

---

### Task 1: Simplify `StockSheetForm.tsx` & Clean Up UI

**Files:**
- Modify: `src/components/wood-cut/StockSheetForm.tsx`

**Interfaces:**
- Props:
  ```typescript
  interface Props {
    stockSheets: StockSheetInput[];
    setStockSheets: (sheets: StockSheetInput[]) => void;
    config: CalculationConfig;
    setConfig: (config: CalculationConfig) => void;
  }
  ```

- [ ] **Step 1: Update `src/components/wood-cut/StockSheetForm.tsx`**

Remove DP checkbox and badge:
```tsx
"use client";

import React from "react";
import { StockSheetInput, CalculationConfig } from "@/types/woodCut";
import NumericInput from "./NumericInput";

interface Props {
  stockSheets: StockSheetInput[];
  setStockSheets: (sheets: StockSheetInput[]) => void;
  config: CalculationConfig;
  setConfig: (config: CalculationConfig) => void;
}

export default function StockSheetForm({ stockSheets, setStockSheets, config, setConfig }: Props) {
  const handleAddStockSheet = () => {
    setStockSheets([
      ...stockSheets,
      {
        id: `s-${Date.now()}`,
        name: `Ván gốc ${stockSheets.length + 1}`,
        length: 1200,
        width: 600,
      },
    ]);
  };

  const handleUpdate = (id: string, field: keyof StockSheetInput, val: any) => {
    setStockSheets(stockSheets.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleRemove = (id: string) => {
    if (stockSheets.length <= 1) return;
    setStockSheets(stockSheets.filter(s => s.id !== id));
  };

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📦</span> Ván Gỗ Gốc (Khổ ván mua/có sẵn)
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
            Lưỡi cưa (Kerf):
            <NumericInput
              value={config.kerf}
              onChange={(val) => setConfig({ ...config, kerf: val })}
              min={0}
              max={20}
              defaultValue={3}
              className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
              ariaLabel="Độ dày lưỡi cưa"
            />
            mm
          </label>
        </div>
      </div>

      {/* Bảng danh sách ván gốc */}
      <div className="space-y-2">
        {stockSheets.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
            <input
              type="text"
              value={s.name || ""}
              placeholder="Tên ván gốc"
              onChange={(e) => handleUpdate(s.id, "name", e.target.value)}
              className="flex-1 min-w-[100px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-violet-400"
            />
            <div className="flex items-center gap-1">
              <NumericInput
                value={s.length}
                onChange={(val) => handleUpdate(s.id, "length", val)}
                min={1}
                defaultValue={1200}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Dài"
                ariaLabel={`Chiều dài ${s.name || "ván gốc"}`}
              />
              <span className="text-slate-400 text-xs">×</span>
              <NumericInput
                value={s.width}
                onChange={(val) => handleUpdate(s.id, "width", val)}
                min={1}
                defaultValue={600}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Rộng"
                ariaLabel={`Chiều rộng ${s.name || "ván gốc"}`}
              />
              <span className="text-slate-400 text-[10px]">mm</span>
            </div>
            {stockSheets.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                title="Xóa ván gốc này"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Nút thêm ván gốc */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-start">
        <button
          type="button"
          onClick={handleAddStockSheet}
          className="text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>+</span> Thêm ván gốc
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit Task 1**

```bash
git add src/components/wood-cut/StockSheetForm.tsx
git commit -m "refactor(wood-cut): remove DP checkbox and badge from StockSheetForm"
```

---

### Task 2: Simplify `WoodCutPage.tsx` Calculation Pipeline & State

**Files:**
- Modify: `src/app/wood-cut/page.tsx`
- Modify: `src/__tests__/woodCutIntegration.test.ts` (if needed)

- [ ] **Step 1: Update `src/app/wood-cut/page.tsx`**

1. Remove `import { solveGroundTruthDP } from "@/lib/cp/dpGroundTruthOptimizer";`
2. Change `INITIAL_CONFIG`:
```typescript
const INITIAL_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};
```
3. Update `handleCalculate`:
```typescript
const handleCalculate = () => {
  try {
    const res = calculateWoodCut(stockSheets, pieces, config);
    setResult(res);
  } catch (e) {
    console.error("Lỗi tính toán cắt gỗ:", e);
  }
};
```
4. Update `StockSheetForm` call:
```tsx
<StockSheetForm
  stockSheets={stockSheets}
  setStockSheets={setStockSheets}
  config={config}
  setConfig={setConfig}
/>
```

- [ ] **Step 2: Run integration tests**

Run: `npx vitest run src/__tests__/woodCutIntegration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit Task 2**

```bash
git add src/app/wood-cut/page.tsx src/__tests__/woodCutIntegration.test.ts
git commit -m "refactor(wood-cut): simplify calculation pipeline and remove DP branching in page.tsx"
```

---

### Task 3: Full Project Test Suite Verification

**Files:**
- Run full test suite: `npm test`

- [ ] **Step 1: Run `npm test`**

Expected: All 19 test files PASS (100% pass rate).

- [ ] **Step 2: Push changes to `origin/dev`**

Run: `git push origin dev`
