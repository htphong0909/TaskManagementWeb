# Wood Grain Orientation & Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng định hướng vân gỗ (vân ngang / vân dọc / không vân) và trực quan hóa vân gỗ theo thời gian thực cho ván phôi gốc, các mặt gỗ cần làm, sơ đồ cắt và sơ đồ ghép trên trang `/wood-cut`.

**Architecture:** 
1. Mở rộng `types/woodCut.ts` với kiểu `WoodGrain = "none" | "horizontal" | "vertical"`, thêm cấu hình `stockGrain` vào `CalculationConfig`, cập nhật `RequiredPieceInput.grain`.
2. Nâng cấp thuật toán `woodCuttingOptimizer.ts` và `woodDecomposer.ts` áp dụng nguyên lý xẻ gỗ vật lý (cùng vân $\to$ không xoay, khác vân $\to$ xoay $90^\circ$, không vân $\to$ tự do xoay).
3. Tạo 2 component xem trước độc lập (`StockSheetVisualizer.tsx` và `RequiredPiecesVisualizer.tsx`) render SVG tỉ lệ chuẩn và thớ vân trực quan tại form nhập liệu.
4. Cập nhật `CuttingDiagram.tsx` và `JoinedPieceDiagramView.tsx` render hoa văn vân gỗ động và badge định hướng cho thợ mộc.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vitest, SVG.

## Global Constraints

- **Type safety:** Không sử dụng kiểu `any`. Định nghĩa interface rõ ràng cho props và state.
- **Styling:** Tuân thủ chuẩn Glass-Pastel của dự án (Tailwind CSS v4, bo góc `rounded-xl` / `rounded-2xl`, màu pastel dịu mắt).
- **Responsive & Performance:** Tỉ lệ SVG co giãn linh hoạt, không gây giật lag khi thay đổi kích thước theo thời gian thực.
- **Testing:** 100% test case hiện có phải tiếp tục PASS, viết bổ sung test cho tính năng mới.

---

### Task 1: Mở Rộng Type & Cấu Hình Vân Gỗ (`src/types/woodCut.ts`)

**Files:**
- Modify: `src/types/woodCut.ts`
- Test: `src/lib/__tests__/woodCuttingGrainTypes.test.ts`

**Interfaces:**
- Produces:
  - `export type WoodGrain = "none" | "horizontal" | "vertical";`
  - `CalculationConfig.stockGrain: WoodGrain`
  - `RequiredPieceInput.grain?: WoodGrain`
  - `PlacedPiece.appliedGrain?: WoodGrain`
  - `SubPiece.appliedGrain?: WoodGrain`

- [ ] **Step 1: Viết test kiểm tra cấu trúc type và giá trị mặc định**

Tạo file `src/lib/__tests__/woodCuttingGrainTypes.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { CalculationConfig, RequiredPieceInput, WoodGrain } from "@/types/woodCut";

describe("Wood Grain Types", () => {
  it("should allow assigning valid WoodGrain values", () => {
    const grains: WoodGrain[] = ["none", "horizontal", "vertical"];
    expect(grains).toHaveLength(3);
  });

  it("should support stockGrain in CalculationConfig", () => {
    const config: CalculationConfig = {
      kerf: 3,
      minSubPieceSize: 50,
      stockGrain: "horizontal",
    };
    expect(config.stockGrain).toBe("horizontal");
  });

  it("should support grain in RequiredPieceInput", () => {
    const piece: RequiredPieceInput = {
      id: "p-1",
      name: "Tấm thử",
      length: 800,
      width: 400,
      quantity: 1,
      grain: "vertical",
    };
    expect(piece.grain).toBe("vertical");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận lỗi compile/type**

Run: `npx vitest run src/lib/__tests__/woodCuttingGrainTypes.test.ts`
Expected: FAIL do chưa có trường `stockGrain` và `grain`.

- [ ] **Step 3: Cập nhật `src/types/woodCut.ts`**

Chỉnh sửa `src/types/woodCut.ts`:
```typescript
export type WoodGrain = "none" | "horizontal" | "vertical";
export type PieceOrientation = "auto" | "vertical" | "horizontal";

export interface StockSheetInput {
  id: string;
  name?: string;
  length: number; // mm
  width: number;  // mm
  quantity?: number;
  cost?: number;
}

export interface RequiredPieceInput {
  id: string;
  name: string;
  length: number; // mm
  width: number;  // mm
  quantity: number;
  grain?: WoodGrain;              // "none" (Tự do xoay) | "horizontal" (Vân ngang) | "vertical" (Vân dọc)
  orientation?: PieceOrientation; // Giữ để tương thích ngược
  allowRotation?: boolean;
}

export interface CalculationConfig {
  kerf: number;            // Độ dày mạch cưa (mm)
  minSubPieceSize: number; // Kích thước tối thiểu mảnh ghép (mm)
  stockGrain?: WoodGrain;  // Hướng vân ván phôi gốc (mặc định: "horizontal")
  useExactDP?: boolean;
}

export interface SubPiece {
  id: string;
  parentId: string;
  parentName: string;
  relX: number;
  relY: number;
  length: number;
  width: number;
  allowRotation: boolean;
  orientation?: PieceOrientation;
  grain?: WoodGrain;
  appliedGrain?: WoodGrain;
  stockSheetIndex?: number;
  stockSheetName?: string;
  rotatedOnSheet?: boolean;
}

export interface PlacedPiece {
  id: string;
  name: string;
  isSubPiece: boolean;
  parentId?: string;
  parentName?: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated: boolean;
  color: string;
  appliedGrain?: WoodGrain;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/lib/__tests__/woodCuttingGrainTypes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/woodCut.ts src/lib/__tests__/woodCuttingGrainTypes.test.ts
git commit -m "feat: add WoodGrain type and extend CalculationConfig and RequiredPieceInput"
```

---

### Task 2: Cập Nhật Thuật Toán Xếp Ván & Khớp Vân (`src/lib/woodCuttingOptimizer.ts`, `src/lib/woodDecomposer.ts`, `src/lib/woodCutParser.ts`)

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Modify: `src/lib/woodDecomposer.ts`
- Modify: `src/lib/woodCutParser.ts`
- Test: `src/lib/__tests__/woodCuttingGrainPhysics.test.ts`

**Interfaces:**
- Consumes: `WoodGrain`, `CalculationConfig.stockGrain`, `RequiredPieceInput.grain`
- Produces:
  - Cắt cùng vân $\to$ không xoay (`rotated: false`).
  - Cắt khác vân $\to$ xoay $90^\circ$ (`rotated: true`).
  - Ván gốc không vân $\to$ thử cả 2 hướng tối ưu diện tích.

- [ ] **Step 1: Viết test kiểm tra quy tắc vật lý khớp vân**

Tạo file `src/lib/__tests__/woodCuttingGrainPhysics.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";

describe("Wood Cutting Grain Physical Constraints", () => {
  const stock: StockSheetInput[] = [
    { id: "s1", length: 1200, width: 600 },
  ];

  it("should NOT rotate piece when piece grain matches stock grain (horizontal)", () => {
    const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "horizontal" };
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Cùng vân", length: 500, width: 200, quantity: 1, grain: "horizontal" },
    ];
    const res = calculateWoodCut(stock, pieces, config);
    expect(res.stockSheetsUsed).toHaveLength(1);
    const placed = res.stockSheetsUsed[0].placedPieces[0];
    expect(placed.rotated).toBe(false);
    expect(placed.length).toBe(500);
    expect(placed.width).toBe(200);
  });

  it("should ROTATE piece 90 degrees when piece grain opposes stock grain (vertical on horizontal stock)", () => {
    const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "horizontal" };
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Khác vân", length: 500, width: 200, quantity: 1, grain: "vertical" },
    ];
    const res = calculateWoodCut(stock, pieces, config);
    expect(res.stockSheetsUsed).toHaveLength(1);
    const placed = res.stockSheetsUsed[0].placedPieces[0];
    expect(placed.rotated).toBe(true);
    expect(placed.length).toBe(200);
    expect(placed.width).toBe(500);
  });

  it("should allow free rotation when stockGrain is 'none'", () => {
    const config: CalculationConfig = { kerf: 3, minSubPieceSize: 50, stockGrain: "none" };
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tự do", length: 500, width: 200, quantity: 1, grain: "vertical" },
    ];
    const res = calculateWoodCut(stock, pieces, config);
    expect(res.stockSheetsUsed).toHaveLength(1);
    expect(res.stockSheetsUsed[0].placedPieces).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/lib/__tests__/woodCuttingGrainPhysics.test.ts`
Expected: FAIL do chưa tích hợp `stockGrain` và `grain` vào `packCandidate`.

- [ ] **Step 3: Cập nhật `src/lib/woodCuttingOptimizer.ts`**

Trong `calculateWoodCut`:
Thiết lập `stockGrain`:
```typescript
const stockGrain: WoodGrain = config.stockGrain || "horizontal";
```

Trong hàm `packCandidate`:
Thay thế đoạn xác định `tryNormal` và `tryRotated` (khoảng dòng 350-353):
```typescript
const itemGrain: WoodGrain =
  ("grain" in item && item.grain)
    ? item.grain
    : (item.orientation === "vertical" ? "vertical" : item.orientation === "horizontal" ? "horizontal" : "none");

let tryNormal = true;
let tryRotated = true;

if (stockGrain === "none" || itemGrain === "none") {
  tryNormal = true;
  tryRotated = true;
} else if (itemGrain === stockGrain) {
  tryNormal = true;
  tryRotated = false;
} else {
  // Khác vân: Bắt buộc xoay 90 độ
  tryNormal = false;
  tryRotated = true;
}
```

Và khi gán `placedPieces.push`:
```typescript
appliedGrain: stockGrain === "none" ? "none" : stockGrain,
```

- [ ] **Step 4: Cập nhật `src/lib/woodDecomposer.ts` và `src/lib/woodCutParser.ts`**

Trong `woodDecomposer.ts`:
Cập nhật việc truyền `grain` và `appliedGrain` vào `SubPiece`, đồng thời xử lý `stockGrain`.

Trong `woodCutParser.ts`:
Hỗ trợ nhận diện các flag:
`!ngang` $\to$ `grain: "horizontal"`, `orientation: "horizontal"`
`!doc` $\to$ `grain: "vertical"`, `orientation: "vertical"`
`!xoay` / `!none` $\to$ `grain: "none"`, `orientation: "auto"`

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npx vitest run src/lib/__tests__/woodCuttingGrainPhysics.test.ts`
Expected: PASS.

- [ ] **Step 6: Chạy hồi quy toàn bộ test**

Run: `npm run test`
Expected: Toàn bộ các test suite hiện có đều PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/woodDecomposer.ts src/lib/woodCutParser.ts src/lib/__tests__/woodCuttingGrainPhysics.test.ts
git commit -m "feat: implement physical grain orientation constraints in cutting optimizer"
```

---

### Task 3: Component Xem Trước Ván Gốc & Tùy Chọn Vân (`StockSheetForm.tsx`, `StockSheetVisualizer.tsx`)

**Files:**
- Create: `src/components/wood-cut/StockSheetVisualizer.tsx`
- Modify: `src/components/wood-cut/StockSheetForm.tsx`
- Test: `src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx`

**Interfaces:**
- Props for `StockSheetVisualizer`:
  ```typescript
  interface Props {
    stockSheets: StockSheetInput[];
    stockGrain: WoodGrain;
  }
  ```

- [ ] **Step 1: Viết test cho `StockSheetVisualizer`**

Tạo file `src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx`:
```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StockSheetVisualizer from "../StockSheetVisualizer";

describe("StockSheetVisualizer", () => {
  it("renders preview cards with correct dimensions and grain labels", () => {
    const sheets = [{ id: "s1", name: "Ván 1", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="horizontal" />);
    expect(screen.getByText("Ván 1")).toBeDefined();
    expect(screen.getByText(/1200 × 600 mm/)).toBeDefined();
    expect(screen.getByText(/Vân ngang/)).toBeDefined();
  });

  it("renders correct badge when grain is none", () => {
    const sheets = [{ id: "s1", name: "Ván trơn", length: 1200, width: 600 }];
    render(<StockSheetVisualizer stockSheets={sheets} stockGrain="none" />);
    expect(screen.getByText(/Không vân/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx`
Expected: FAIL do chưa tạo component `StockSheetVisualizer`.

- [ ] **Step 3: Tạo `StockSheetVisualizer.tsx`**

Tạo file `src/components/wood-cut/StockSheetVisualizer.tsx`:
```tsx
"use client";

import React from "react";
import { StockSheetInput, WoodGrain } from "@/types/woodCut";

interface Props {
  stockSheets: StockSheetInput[];
  stockGrain: WoodGrain;
}

export default function StockSheetVisualizer({ stockSheets, stockGrain }: Props) {
  if (!stockSheets || stockSheets.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
          <span>👁️</span> Mô phỏng ván phôi & hướng thớ gỗ
        </span>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {stockGrain === "horizontal"
            ? "↔️ Vân ngang"
            : stockGrain === "vertical"
            ? "↕️ Vân dọc"
            : "🚫 Không vân"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stockSheets.map((s, idx) => {
          const maxDim = Math.max(s.length, s.width, 1);
          const aspect = (s.width / s.length) * 100;
          const grainPatternId = `stock-visual-grain-${s.id}-${stockGrain}`;

          return (
            <div
              key={s.id}
              className="bg-[#faf7f2] border border-[#e5dcce] rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:border-violet-300 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-extrabold text-slate-800">
                  {s.name || `Ván ${idx + 1}`}
                </span>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  {s.length} × {s.width} mm
                </span>
              </div>

              {/* Khung SVG hình chữ nhật theo đúng tỉ lệ */}
              <div className="w-full h-24 bg-[#f5ede1] rounded-lg border border-[#dfd2be] overflow-hidden flex items-center justify-center p-1 relative">
                <svg
                  viewBox={`0 0 ${s.length} ${s.width}`}
                  className="max-h-full max-w-full drop-shadow-xs"
                >
                  <defs>
                    {stockGrain === "horizontal" && (
                      <pattern
                        id={grainPatternId}
                        width="80"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M0 10 Q40 5 80 10 M0 25 Q40 30 80 25"
                          fill="none"
                          stroke="#caa882"
                          strokeWidth="1.2"
                          strokeOpacity="0.6"
                        />
                      </pattern>
                    )}
                    {stockGrain === "vertical" && (
                      <pattern
                        id={grainPatternId}
                        width="40"
                        height="80"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M10 0 Q5 40 10 80 M25 0 Q30 40 25 80"
                          fill="none"
                          stroke="#caa882"
                          strokeWidth="1.2"
                          strokeOpacity="0.6"
                        />
                      </pattern>
                    )}
                  </defs>

                  <rect
                    x="0"
                    y="0"
                    width={s.length}
                    height={s.width}
                    fill="#fcf9f2"
                    stroke="#bda98e"
                    strokeWidth="3"
                    rx="4"
                  />

                  {stockGrain !== "none" && (
                    <rect
                      x="0"
                      y="0"
                      width={s.length}
                      height={s.width}
                      fill={`url(#${grainPatternId})`}
                    />
                  )}
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Cập nhật `StockSheetForm.tsx`**

Thêm bộ nút chọn 3 trạng thái ở header:
```tsx
<div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
  <button
    type="button"
    onClick={() => setConfig({ ...config, stockGrain: "none" })}
    className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
      (config.stockGrain || "horizontal") === "none"
        ? "bg-white text-slate-800 shadow-xs"
        : "text-slate-500 hover:text-slate-800"
    }`}
  >
    🚫 Không vân
  </button>
  <button
    type="button"
    onClick={() => setConfig({ ...config, stockGrain: "horizontal" })}
    className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
      (config.stockGrain || "horizontal") === "horizontal"
        ? "bg-white text-violet-700 shadow-xs"
        : "text-slate-500 hover:text-slate-800"
    }`}
  >
    ↔️ Vân ngang
  </button>
  <button
    type="button"
    onClick={() => setConfig({ ...config, stockGrain: "vertical" })}
    className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
      (config.stockGrain || "horizontal") === "vertical"
        ? "bg-white text-violet-700 shadow-xs"
        : "text-slate-500 hover:text-slate-800"
    }`}
  >
    ↕️ Vân dọc
  </button>
</div>
```
Và nhúng `<StockSheetVisualizer stockSheets={stockSheets} stockGrain={config.stockGrain || "horizontal"} />` ngay dưới nút "+ Thêm ván gốc".

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npx vitest run src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wood-cut/StockSheetVisualizer.tsx src/components/wood-cut/StockSheetForm.tsx src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx
git commit -m "feat: add StockSheetVisualizer and stockGrain segmented control"
```

---

### Task 4: Component Xem Trước Mặt Gỗ Cần Làm & Dropdown Chọn Vân (`RequiredPiecesForm.tsx`, `RequiredPiecesVisualizer.tsx`)

**Files:**
- Create: `src/components/wood-cut/RequiredPiecesVisualizer.tsx`
- Modify: `src/components/wood-cut/RequiredPiecesForm.tsx`
- Test: `src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`

**Interfaces:**
- Props for `RequiredPiecesVisualizer`:
  ```typescript
  interface Props {
    pieces: RequiredPieceInput[];
    stockGrain: WoodGrain;
  }
  ```

- [ ] **Step 1: Viết test cho `RequiredPiecesVisualizer`**

Tạo file `src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`:
```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RequiredPiecesVisualizer from "../RequiredPiecesVisualizer";

describe("RequiredPiecesVisualizer", () => {
  it("renders miniature pieces with names and grain direction", () => {
    const pieces = [
      { id: "p1", name: "Mặt bàn", length: 800, width: 400, quantity: 1, grain: "horizontal" as const },
    ];
    render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="horizontal" />);
    expect(screen.getByText("Mặt bàn")).toBeDefined();
    expect(screen.getByText(/800 × 400 mm/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tạo `RequiredPiecesVisualizer.tsx`**

Tạo file `src/components/wood-cut/RequiredPiecesVisualizer.tsx`:
- Render các card thu nhỏ với mã màu pastel phân biệt (`#a78bfa`, `#38bdf8`, `#34d399`...).
- SVG hiển thị đúng sóng vân (ngang nếu `grain === "horizontal"`, dọc nếu `grain === "vertical"`, không vân nếu `grain === "none"` hoặc `stockGrain === "none"`).
- Ghi rõ kích thước mm và số lượng.

- [ ] **Step 4: Cập nhật `RequiredPiecesForm.tsx`**

1. Nhận thêm prop `stockGrain: WoodGrain`.
2. Thay đổi dropdown chọn vân thành:
   ```tsx
   <select
     value={stockGrain === "none" ? "none" : (p.grain || "horizontal")}
     disabled={stockGrain === "none"}
     onChange={(e) => {
       const g = e.target.value as WoodGrain;
       handleUpdateMultiple(p.id, {
         grain: g,
         orientation: g === "vertical" ? "vertical" : g === "horizontal" ? "horizontal" : "auto",
         allowRotation: g === "none",
       });
     }}
     className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200 outline-none disabled:opacity-60 disabled:bg-slate-100"
   >
     <option value="horizontal">↔️ Vân ngang</option>
     <option value="vertical">↕️ Vân dọc</option>
     <option value="none">🔄 Không vân</option>
   </select>
   ```
3. Nhúng `<RequiredPiecesVisualizer pieces={pieces} stockGrain={stockGrain} />` vào cuối form.

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `npx vitest run src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wood-cut/RequiredPiecesVisualizer.tsx src/components/wood-cut/RequiredPiecesForm.tsx src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx
git commit -m "feat: add RequiredPiecesVisualizer and updated grain selection dropdown"
```

---

### Task 5: Nâng Cấp Sơ Đồ Cắt & Sơ Đồ Ghép Với Vân Gỗ Động (`CuttingDiagram.tsx`, `JoinedPieceDiagramView.tsx`, `page.tsx`)

**Files:**
- Modify: `src/components/wood-cut/CuttingDiagram.tsx`
- Modify: `src/components/wood-cut/JoinedPieceDiagramView.tsx`
- Modify: `src/app/wood-cut/page.tsx`
- Test: `src/__tests__/woodCutIntegration.test.ts`

**Interfaces:**
- In `CuttingDiagram`:
  - SVG sheet background adapts pattern to sheet grain.
  - Placed pieces have SVG grain pattern and badges indicating grain status (`↔️ Vân ngang`, `↕️ Vân dọc (Đã xoay 90° để khớp thớ)`).
- In `JoinedPieceDiagramView`:
  - Panel renders master grain pattern across sub-piece joints.

- [ ] **Step 1: Cập nhật `CuttingDiagram.tsx`**

Thêm định nghĩa pattern vân gỗ linh hoạt (ngang và dọc) trong `<defs>`.
Phủ lớp hoa văn vân gỗ lên từng hình chữ nhật chi tiết cắt (`PlacedPiece`).
Cập nhật nhãn text chi tiết hiển thị trạng thái vân thực tế.

- [ ] **Step 2: Cập nhật `JoinedPieceDiagramView.tsx`**

Vẽ hoa văn vân gỗ chạy xuyên suốt tấm lớn để thể hiện tính liền mạch của các mẩu ghép.

- [ ] **Step 3: Cập nhật `src/app/wood-cut/page.tsx`**

Cập nhật `INITIAL_CONFIG`:
```typescript
const INITIAL_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
  stockGrain: "horizontal",
};
```
Truyền `config.stockGrain` vào `RequiredPiecesForm`.

- [ ] **Step 4: Chạy test tích hợp**

Run: `npx vitest run src/__tests__/woodCutIntegration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/wood-cut/CuttingDiagram.tsx src/components/wood-cut/JoinedPieceDiagramView.tsx src/app/wood-cut/page.tsx
git commit -m "feat: render dynamic wood grain patterns and badges on cutting and joined diagrams"
```

---

### Task 6: Kiểm Thử Toàn Diện, Lint & Build

**Files:**
- Test: All tests across the application.

- [ ] **Step 1: Chạy kiểm tra cú pháp (Linting)**

Run: `npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Chạy toàn bộ test suite (Vitest)**

Run: `npm run test`
Expected: 100% tests PASS.

- [ ] **Step 3: Kiểm tra biên dịch Next.js (Build)**

Run: `npm run build`
Expected: Build thành công không có lỗi type hoặc cấu trúc.

- [ ] **Step 4: Commit hoàn tất**

```bash
git commit -am "chore: complete wood grain orientation and visualization feature verification"
```
