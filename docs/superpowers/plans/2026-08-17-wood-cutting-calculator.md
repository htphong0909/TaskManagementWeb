# Kế Hoạch Triển Khai: Trang Tính Toán & Tối Ưu Cắt Ghép Ván Gỗ (Wood Cutting & Joining Optimizer)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng trang `/wood-cut` độc lập và liên kết 2 chiều với trang Board (`/board/[id]`), tích hợp thuật toán tối ưu hóa 2 giai đoạn (ghép tấm lớn tối thiểu vết cắt và xếp ván 2D Guillotine Packing tiết kiệm vật tư nhất) kèm sơ đồ SVG trực quan tỷ lệ chuẩn.

**Architecture:** Kiến trúc module hóa sạch sẽ: Tách riêng các kiểu dữ liệu (`src/types/woodCut.ts`), bộ phân tích cú pháp (`src/lib/woodCutParser.ts`), thuật toán phân rã ghép tấm lớn (`src/lib/woodDecomposer.ts`), thuật toán xếp ván Guillotine 2D (`src/lib/woodCuttingOptimizer.ts`), các component giao diện trực quan SVG (`src/components/wood-cut/`), và trang lắp ráp Next.js (`src/app/wood-cut/page.tsx`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (Glass-Pastel UI), Vitest, SVG Rendering.

## Global Constraints

- Tuân thủ quy chuẩn CSS Tailwind v4: `bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]`, thẻ kính bo tròn `rounded-2xl`, nút chuyển đổi góc trên bên phải.
- TypeScript strictly typed: Không sử dụng `any`.
- TDD: Viết unit tests trước cho từng hàm xử lý thuật toán và parser.
- Mọi nhát cắt đều theo quy chuẩn Guillotine cut (cắt thẳng máy cưa bàn).
- Tự động lưu và khôi phục trạng thái bảng tính từ `localStorage`.

---

### Task 1: Định Nghĩa Kiểu Dữ Liệu (TypeScript Types)

**Files:**
- Create: `src/types/woodCut.ts`

**Interfaces:**
- Produces: `StockSheetInput`, `RequiredPieceInput`, `CalculationConfig`, `SubPiece`, `PlacedPiece`, `PlacedStockSheet`, `JoinedPieceDiagram`, `CalculationResult`, `ParseError`.

- [ ] **Step 1: Tạo file định nghĩa types**

```typescript
// src/types/woodCut.ts

export interface StockSheetInput {
  id: string;
  name?: string;
  length: number; // mm
  width: number;  // mm
  quantity?: number; // số lượng có sẵn (undefined/null = vô hạn)
  cost?: number;
}

export interface RequiredPieceInput {
  id: string;
  name: string;
  length: number; // mm
  width: number;  // mm
  quantity: number;
  allowRotation: boolean; // true = cho phép xoay 90 độ, false = giữ hướng vân gỗ
}

export interface CalculationConfig {
  kerf: number;            // Độ dày mạch cưa (mm), mặc định 3mm
  minSubPieceSize: number; // Kích thước tối thiểu của tấm ghép (mm), mặc định 50mm
}

export interface SubPiece {
  id: string;
  parentId: string;
  parentName: string;
  relX: number; // Toạ độ X trên tấm lớn
  relY: number; // Toạ độ Y trên tấm lớn
  length: number;
  width: number;
  allowRotation: boolean;
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
}

export interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedStockSheet {
  sheetIndex: number;
  stockType: StockSheetInput;
  length: number;
  width: number;
  placedPieces: PlacedPiece[];
  usedArea: number;
  wasteArea: number;
  efficiency: number; // %
  cutsCount: number;
}

export interface JoinedPieceDiagram {
  parentId: string;
  parentName: string;
  targetLength: number;
  targetWidth: number;
  subPieces: SubPiece[];
  seamCount: number;
}

export interface CalculationResult {
  stockSheetsUsed: PlacedStockSheet[];
  joinedPieces: JoinedPieceDiagram[];
  summary: {
    totalStockSheets: number;
    sheetBreakdown: { [key: string]: number }; // ví dụ: {"1200x600": 3, "2440x1220": 1}
    totalRequiredArea: number; // m2
    totalStockArea: number;    // m2
    totalUsedArea: number;     // m2
    totalWasteArea: number;    // m2
    efficiencyPercent: number; // %
    totalCutsCount: number;
    totalSeamsCount: number;
  };
}
```

- [ ] **Step 2: Kiểm tra biên dịch TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS (không có lỗi type)

- [ ] **Step 3: Commit**

```bash
git add src/types/woodCut.ts; git commit -m "feat: define typescript interfaces for wood cut optimizer"
```

---

### Task 2: Bộ Phân Tích Cú Pháp Nhập Nhanh (Batch Text Parser)

**Files:**
- Create: `src/lib/woodCutParser.ts`
- Test: `src/lib/__tests__/woodCutParser.test.ts`

**Interfaces:**
- Consumes: `RequiredPieceInput` from `src/types/woodCut.ts`
- Produces: `parseRequiredPiecesText(text: string): { pieces: RequiredPieceInput[], errors: string[] }`, `formatPiecesToText(pieces: RequiredPieceInput[]): string`

- [ ] **Step 1: Viết failing test cho `woodCutParser`**

```typescript
// src/lib/__tests__/woodCutParser.test.ts
import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText, formatPiecesToText } from "../woodCutParser";

describe("woodCutParser", () => {
  it("parses comma-separated dimensions accurately", () => {
    const input = "1110, 1230\n234, 234";
    const result = parseRequiredPiecesText(input);
    expect(result.errors).toHaveLength(0);
    expect(result.pieces).toHaveLength(2);
    expect(result.pieces[0]).toMatchObject({ length: 1110, width: 1230, quantity: 1, allowRotation: true });
    expect(result.pieces[1]).toMatchObject({ length: 234, width: 234, quantity: 1, allowRotation: true });
  });

  it("parses x notation with quantity", () => {
    const input = "1110x1230 x2\n500*600, 3";
    const result = parseRequiredPiecesText(input);
    expect(result.errors).toHaveLength(0);
    expect(result.pieces[0]).toMatchObject({ length: 1110, width: 1230, quantity: 2 });
    expect(result.pieces[1]).toMatchObject({ length: 500, width: 600, quantity: 3 });
  });

  it("handles empty lines and whitespace gracefully", () => {
    const input = "\n  1110, 1230  \n\n  234,   234 \n";
    const result = parseRequiredPiecesText(input);
    expect(result.pieces).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- src/lib/__tests__/woodCutParser.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Cài đặt code `src/lib/woodCutParser.ts`**

```typescript
// src/lib/woodCutParser.ts
import { RequiredPieceInput } from "@/types/woodCut";

export function parseRequiredPiecesText(text: string): { pieces: RequiredPieceInput[]; errors: string[] } {
  const lines = text.split("\n");
  const pieces: RequiredPieceInput[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    // Pattern 1: 1110, 1230 or 1110, 1230, 2
    // Pattern 2: 1110x1230 x2 or 1110*1230, 2 or 1110 1230 2
    const sanitized = trimmed.replace(/[xX*]/g, " ").replace(/[,;]/g, " ");
    const parts = sanitized.split(/\s+/).filter(Boolean);

    if (parts.length < 2) {
      errors.push(`Dòng ${index + 1}: Không đúng định dạng kích thước "${line}"`);
      return;
    }

    const length = parseFloat(parts[0]);
    const width = parseFloat(parts[1]);
    let quantity = 1;

    if (parts.length >= 3) {
      const qStr = parts[2].replace(/[xX#]/g, "");
      const parsedQ = parseInt(qStr, 10);
      if (!isNaN(parsedQ) && parsedQ > 0) {
        quantity = parsedQ;
      }
    }

    if (isNaN(length) || isNaN(width) || length <= 0 || width <= 0) {
      errors.push(`Dòng ${index + 1}: Kích thước phải là số dương lớn hơn 0`);
      return;
    }

    pieces.push({
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: `Tấm ${pieces.length + 1}`,
      length: Math.round(length),
      width: Math.round(width),
      quantity,
      allowRotation: true,
    });
  });

  return { pieces, errors };
}

export function formatPiecesToText(pieces: RequiredPieceInput[]): string {
  return pieces
    .map((p) => `${p.length}, ${p.width}${p.quantity > 1 ? `, ${p.quantity}` : ""}`)
    .join("\n");
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- src/lib/__tests__/woodCutParser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCutParser.ts src/lib/__tests__/woodCutParser.test.ts; git commit -m "feat: add batch text parser for required pieces with tests"
```

---

### Task 3: Thuật Toán Phân Rã & Ghép Ván Lớn (Wood Decomposer)

**Files:**
- Create: `src/lib/woodDecomposer.ts`
- Test: `src/lib/__tests__/woodDecomposer.test.ts`

**Interfaces:**
- Consumes: `RequiredPieceInput`, `StockSheetInput`, `CalculationConfig`
- Produces: `decomposeOversizedPieces(pieces: RequiredPieceInput[], stockSheets: StockSheetInput[], config: CalculationConfig): { flatCutItems: (RequiredPieceInput | SubPiece)[], joinedDiagrams: JoinedPieceDiagram[] }`

- [ ] **Step 1: Viết failing test cho `woodDecomposer`**

```typescript
// src/lib/__tests__/woodDecomposer.test.ts
import { describe, it, expect } from "vitest";
import { decomposeOversizedPieces } from "../woodDecomposer";
import { RequiredPieceInput, StockSheetInput } from "@/types/woodCut";

describe("woodDecomposer", () => {
  const stockSheets: StockSheetInput[] = [
    { id: "s1", length: 1200, width: 600 }
  ];
  const config = { kerf: 3, minSubPieceSize: 50 };

  it("leaves normal sized pieces intact", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm nhỏ", length: 234, width: 234, quantity: 1, allowRotation: true }
    ];
    const result = decomposeOversizedPieces(pieces, stockSheets, config);
    expect(result.joinedDiagrams).toHaveLength(0);
    expect(result.flatCutItems).toHaveLength(1);
    expect(result.flatCutItems[0].length).toBe(234);
  });

  it("decomposes 1110x1230 piece using 1200x600 stock with minimal seams", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p2", name: "Mặt bàn lớn", length: 1110, width: 1230, quantity: 1, allowRotation: true }
    ];
    const result = decomposeOversizedPieces(pieces, stockSheets, config);
    expect(result.joinedDiagrams).toHaveLength(1);
    const diagram = result.joinedDiagrams[0];
    expect(diagram.targetLength).toBe(1110);
    expect(diagram.targetWidth).toBe(1230);
    // 1230 chia thành các tấm con không vượt 600 (ví dụ 3 tấm con: 600, 600, 30 hoặc cân đối)
    expect(diagram.subPieces.length).toBeGreaterThanOrEqual(2);
    // Tổng diện tích các tấm con xấp xỉ diện tích tấm lớn
    const totalSubArea = diagram.subPieces.reduce((acc, sp) => acc + sp.length * sp.width, 0);
    expect(totalSubArea).toBeCloseTo(1110 * 1230, -2);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- src/lib/__tests__/woodDecomposer.test.ts`
Expected: FAIL

- [ ] **Step 3: Cài đặt code `src/lib/woodDecomposer.ts`**

```typescript
// src/lib/woodDecomposer.ts
import { RequiredPieceInput, StockSheetInput, CalculationConfig, SubPiece, JoinedPieceDiagram } from "@/types/woodCut";

export function decomposeOversizedPieces(
  pieces: RequiredPieceInput[],
  stockSheets: StockSheetInput[],
  config: CalculationConfig
): {
  flatCutItems: (RequiredPieceInput | SubPiece)[];
  joinedDiagrams: JoinedPieceDiagram[];
} {
  const flatCutItems: (RequiredPieceInput | SubPiece)[] = [];
  const joinedDiagrams: JoinedPieceDiagram[] = [];

  if (stockSheets.length === 0) {
    return { flatCutItems: pieces, joinedDiagrams: [] };
  }

  // Tìm kích thước tối đa của ván gốc
  let maxStockL = 0;
  let maxStockW = 0;
  for (const s of stockSheets) {
    maxStockL = Math.max(maxStockL, Math.max(s.length, s.width));
    maxStockW = Math.max(maxStockW, Math.min(s.length, s.width));
  }

  for (const piece of pieces) {
    const pL = piece.length;
    const pW = piece.width;

    // Kiểm tra xem tấm này có vừa trong ít nhất 1 loại ván gốc không
    const fitsDirectly = stockSheets.some((s) => {
      const fitNormal = pL <= s.length && pW <= s.width;
      const fitRotated = piece.allowRotation && pL <= s.width && pW <= s.length;
      return fitNormal || fitRotated;
    });

    if (fitsDirectly) {
      for (let q = 0; q < piece.quantity; q++) {
        flatCutItems.push({
          ...piece,
          id: q === 0 ? piece.id : `${piece.id}-${q + 1}`,
          quantity: 1,
        });
      }
      continue;
    }

    // Tấm vượt khổ ván -> Tiến hành phân rã cho từng bản sao số lượng
    for (let q = 0; q < piece.quantity; q++) {
      const instanceId = q === 0 ? piece.id : `${piece.id}-${q + 1}`;
      const instanceName = piece.quantity > 1 ? `${piece.name} (#${q + 1})` : piece.name;

      // Xác định phương chia tối ưu:
      // Thử chia theo chiều rộng (W) hoặc chia theo chiều dài (L)
      const subPieces: SubPiece[] = [];

      // Phân tích chia theo chiều nào ít đường ghép nhất
      const splitAlongWidth = (targetL: number, targetW: number) => {
        const partsW: number[] = [];
        let remainingW = targetW;
        while (remainingW > 0) {
          if (remainingW <= maxStockW) {
            partsW.push(remainingW);
            remainingW = 0;
          } else {
            // Lấy kích thước tối đa ván gốc trước
            let cutW = maxStockW;
            // Tránh mẩu nhỏ cuối cùng
            if (remainingW - cutW < config.minSubPieceSize && remainingW - cutW > 0) {
              cutW = Math.floor(remainingW / 2);
            }
            partsW.push(cutW);
            remainingW -= cutW;
          }
        }
        return partsW;
      };

      // Xác định định hướng ghép
      let useL = pL;
      let useW = pW;
      // Nếu xoay lại mà L <= maxStockL thì chia theo W
      if (piece.allowRotation && pW <= maxStockL && pL > maxStockL) {
        useL = pW;
        useW = pL;
      }

      // Chia chiều dài nếu useL > maxStockL
      const partsL: number[] = [];
      let remL = useL;
      while (remL > 0) {
        if (remL <= maxStockL) {
          partsL.push(remL);
          remL = 0;
        } else {
          let cutL = maxStockL;
          if (remL - cutL < config.minSubPieceSize && remL - cutL > 0) {
            cutL = Math.floor(remL / 2);
          }
          partsL.push(cutL);
          remL -= cutL;
        }
      }

      const partsW = splitAlongWidth(useL, useW);

      let currentY = 0;
      let pieceIndex = 1;
      for (const w of partsW) {
        let currentX = 0;
        for (const l of partsL) {
          const subPiece: SubPiece = {
            id: `sub-${instanceId}-${pieceIndex}`,
            parentId: instanceId,
            parentName: instanceName,
            relX: currentX,
            relY: currentY,
            length: l,
            width: w,
            allowRotation: piece.allowRotation,
          };
          subPieces.push(subPiece);
          flatCutItems.push(subPiece);
          currentX += l;
          pieceIndex++;
        }
        currentY += w;
      }

      joinedDiagrams.push({
        parentId: instanceId,
        parentName: instanceName,
        targetLength: useL,
        targetWidth: useW,
        subPieces,
        seamCount: subPieces.length - 1,
      });
    }
  }

  return { flatCutItems, joinedDiagrams };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- src/lib/__tests__/woodDecomposer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodDecomposer.ts src/lib/__tests__/woodDecomposer.test.ts; git commit -m "feat: implement wood piece decomposition and seam minimization with tests"
```

---

### Task 4: Thuật Toán Xếp Ván 2D Guillotine Packing Engine

**Files:**
- Create: `src/lib/woodCuttingOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Consumes: `StockSheetInput`, `RequiredPieceInput`, `CalculationConfig`, `decomposeOversizedPieces`
- Produces: `calculateWoodCut(stockSheets: StockSheetInput[], requiredPieces: RequiredPieceInput[], config?: Partial<CalculationConfig>): CalculationResult`

- [ ] **Step 1: Viết failing test toàn diện cho `woodCuttingOptimizer`**

```typescript
// src/lib/__tests__/woodCuttingOptimizer.test.ts
import { describe, it, expect } from "vitest";
import { calculateWoodCut } from "../woodCuttingOptimizer";
import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";

describe("woodCuttingOptimizer", () => {
  const stockSheets: StockSheetInput[] = [
    { id: "s1", name: "Ván 1200x600", length: 1200, width: 600 }
  ];

  it("calculates simple piece packing accurately", () => {
    const requiredPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm vuông 234", length: 234, width: 234, quantity: 4, allowRotation: true }
    ];

    const result = calculateWoodCut(stockSheets, requiredPieces, { kerf: 3 });
    expect(result.stockSheetsUsed.length).toBe(1);
    expect(result.stockSheetsUsed[0].placedPieces.length).toBe(4);
    expect(result.summary.totalStockSheets).toBe(1);
    expect(result.summary.efficiencyPercent).toBeGreaterThan(0);
  });

  it("handles user example (1110x1230 and 234x234 on 1200x600 stock)", () => {
    const requiredPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Mặt lớn 1110x1230", length: 1110, width: 1230, quantity: 1, allowRotation: true },
      { id: "p2", name: "Mặt nhỏ 234x234", length: 234, width: 234, quantity: 1, allowRotation: true },
    ];

    const result = calculateWoodCut(stockSheets, requiredPieces, { kerf: 3 });
    expect(result.stockSheetsUsed.length).toBeGreaterThanOrEqual(3);
    expect(result.joinedPieces.length).toBe(1);
    expect(result.summary.totalStockSheets).toBe(result.stockSheetsUsed.length);
  });

  it("respects allowRotation = false for grain direction", () => {
    const rigidStock: StockSheetInput[] = [{ id: "s1", length: 1000, width: 500 }];
    const rigidPieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm dọc", length: 400, width: 800, quantity: 1, allowRotation: false }
    ];

    const result = calculateWoodCut(rigidStock, rigidPieces, { kerf: 0 });
    // Nếu không cho xoay, tấm 400x800 không thể nhét vào 1000x500 mà không xoay (vì width 800 > 500)
    // Decomposer sẽ phân rã hoặc báo không vừa
    expect(result.stockSheetsUsed.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run test -- src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: FAIL

- [ ] **Step 3: Cài đặt code `src/lib/woodCuttingOptimizer.ts`**

```typescript
// src/lib/woodCuttingOptimizer.ts
import {
  StockSheetInput,
  RequiredPieceInput,
  CalculationConfig,
  CalculationResult,
  PlacedStockSheet,
  PlacedPiece,
  FreeRectangle,
  SubPiece,
} from "@/types/woodCut";
import { decomposeOversizedPieces } from "./woodDecomposer";

const DEFAULT_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};

const PASTEL_COLORS = [
  "#a78bfa", // violet
  "#38bdf8", // sky
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#818cf8", // indigo
  "#2dd4bf", // teal
  "#fb923c", // orange
  "#a3e635", // lime
];

interface StockSheetState {
  stockType: StockSheetInput;
  length: number;
  width: number;
  placedPieces: PlacedPiece[];
  freeRects: FreeRectangle[];
  cutsCount: number;
}

export function calculateWoodCut(
  stockSheets: StockSheetInput[],
  requiredPieces: RequiredPieceInput[],
  customConfig?: Partial<CalculationConfig>
): CalculationResult {
  const config: CalculationConfig = { ...DEFAULT_CONFIG, ...customConfig };

  if (stockSheets.length === 0 || requiredPieces.length === 0) {
    return {
      stockSheetsUsed: [],
      joinedPieces: [],
      summary: {
        totalStockSheets: 0,
        sheetBreakdown: {},
        totalRequiredArea: 0,
        totalStockArea: 0,
        totalUsedArea: 0,
        totalWasteArea: 0,
        efficiencyPercent: 0,
        totalCutsCount: 0,
        totalSeamsCount: 0,
      },
    };
  }

  // 1. Phân rã các tấm vượt khổ
  const { flatCutItems, joinedDiagrams } = decomposeOversizedPieces(
    requiredPieces,
    stockSheets,
    config
  );

  // Gán màu sắc cho từng loại item
  const colorMap = new Map<string, string>();
  let colorIdx = 0;
  flatCutItems.forEach((item) => {
    const key = "parentId" in item ? item.parentId : item.name;
    if (!colorMap.has(key)) {
      colorMap.set(key, PASTEL_COLORS[colorIdx % PASTEL_COLORS.length]);
      colorIdx++;
    }
  });

  // 2. Sắp xếp giảm dần diện tích (Best-Fit Decreasing)
  const itemsToPack = [...flatCutItems].sort((a, b) => {
    const areaA = a.length * a.width;
    const areaB = b.length * b.width;
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.length, b.width) - Math.max(a.length, a.width);
  });

  const activeSheets: StockSheetState[] = [];

  // Hàm mở 1 tấm ván gốc mới
  const openNewSheet = (preferredStock?: StockSheetInput): StockSheetState => {
    const stock = preferredStock || stockSheets[0];
    const newSheet: StockSheetState = {
      stockType: stock,
      length: stock.length,
      width: stock.width,
      placedPieces: [],
      freeRects: [{ x: 0, y: 0, width: stock.length, height: stock.width }],
      cutsCount: 0,
    };
    activeSheets.push(newSheet);
    return newSheet;
  };

  // 3. Xếp từng tấm vào khoảng trống tự do
  for (const item of itemsToPack) {
    const isSub = "parentId" in item;
    const itemName = "parentName" in item ? `${item.parentName} (Tấm con)` : (item as RequiredPieceInput).name;
    const itemColor = colorMap.get(isSub ? (item as SubPiece).parentId : (item as RequiredPieceInput).name) || PASTEL_COLORS[0];
    const allowRotation = item.allowRotation;

    let bestSheetIdx = -1;
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestShortSideFit = Number.MAX_VALUE;

    // Tìm kiếm vị trí tốt nhất trong các tấm đã mở (Best Short Side Fit)
    for (let sIdx = 0; sIdx < activeSheets.length; sIdx++) {
      const sheet = activeSheets[sIdx];
      for (let rIdx = 0; rIdx < sheet.freeRects.length; rIdx++) {
        const rect = sheet.freeRects[rIdx];

        // Thử hướng bình thường (length x width)
        if (item.length <= rect.width && item.width <= rect.height) {
          const leftoverW = rect.width - item.length;
          const leftoverH = rect.height - item.width;
          const shortSideFit = Math.min(leftoverW, leftoverH);
          if (shortSideFit < bestShortSideFit) {
            bestShortSideFit = shortSideFit;
            bestSheetIdx = sIdx;
            bestRectIdx = rIdx;
            bestRotated = false;
          }
        }

        // Thử hướng xoay 90 độ (width x length)
        if (allowRotation && item.width <= rect.width && item.length <= rect.height) {
          const leftoverW = rect.width - item.width;
          const leftoverH = rect.height - item.length;
          const shortSideFit = Math.min(leftoverW, leftoverH);
          if (shortSideFit < bestShortSideFit) {
            bestShortSideFit = shortSideFit;
            bestSheetIdx = sIdx;
            bestRectIdx = rIdx;
            bestRotated = true;
          }
        }
      }
    }

    // Nếu không vừa trong bất kỳ tấm đã mở nào -> Mở tấm mới
    if (bestSheetIdx === -1) {
      // Tìm loại ván gốc phù hợp nhất
      let suitableStock = stockSheets.find((s) => {
        const fitN = item.length <= s.length && item.width <= s.width;
        const fitR = allowRotation && item.width <= s.length && item.length <= s.width;
        return fitN || fitR;
      }) || stockSheets[0];

      const newSheet = openNewSheet(suitableStock);
      bestSheetIdx = activeSheets.length - 1;
      bestRectIdx = 0;
      const rect = newSheet.freeRects[0];

      if (allowRotation && item.width <= rect.width && item.length <= rect.height && item.length > rect.width) {
        bestRotated = true;
      } else {
        bestRotated = false;
      }
    }

    // Đặt tấm vào vị trí
    const targetSheet = activeSheets[bestSheetIdx];
    const targetRect = targetSheet.freeRects.splice(bestRectIdx, 1)[0];

    const placedW = bestRotated ? item.width : item.length;
    const placedH = bestRotated ? item.length : item.width;

    const placedPiece: PlacedPiece = {
      id: item.id,
      name: itemName,
      isSubPiece: isSub,
      parentId: isSub ? (item as SubPiece).parentId : undefined,
      parentName: isSub ? (item as SubPiece).parentName : undefined,
      x: targetRect.x,
      y: targetRect.y,
      length: placedW,
      width: placedH,
      rotated: bestRotated,
      color: itemColor,
    };
    targetSheet.placedPieces.push(placedPiece);
    targetSheet.cutsCount += 2; // Tối thiểu 2 đường cắt xẻ

    // 4. Guillotine Split khoảng trống còn lại (Shorter Axis Split có tính mạch cưa kerf)
    const k = config.kerf;
    const remRightW = targetRect.width - placedW - k;
    const remBottomH = targetRect.height - placedH - k;

    if (remRightW > 0 && placedH > 0) {
      targetSheet.freeRects.push({
        x: targetRect.x + placedW + k,
        y: targetRect.y,
        width: remRightW,
        height: placedH,
      });
    }

    if (remBottomH > 0 && targetRect.width > 0) {
      targetSheet.freeRects.push({
        x: targetRect.x,
        y: targetRect.y + placedH + k,
        width: targetRect.width,
        height: remBottomH,
      });
    }

    // Lọc bỏ các khoảng trống quá nhỏ
    targetSheet.freeRects = targetSheet.freeRects.filter(
      (r) => r.width >= 10 && r.height >= 10
    );
  }

  // 5. Tổng hợp kết quả đầu ra
  let totalStockArea = 0;
  let totalUsedArea = 0;
  let totalCuts = 0;
  const sheetBreakdown: { [key: string]: number } = {};

  const stockSheetsUsed: PlacedStockSheet[] = activeSheets.map((sheet, index) => {
    const sKey = `${sheet.length}x${sheet.width}`;
    sheetBreakdown[sKey] = (sheetBreakdown[sKey] || 0) + 1;

    const sArea = (sheet.length * sheet.width) / 1_000_000;
    const uArea = sheet.placedPieces.reduce(
      (acc, p) => acc + (p.length * p.width) / 1_000_000,
      0
    );
    const wasteArea = Math.max(0, sArea - uArea);
    const efficiency = sArea > 0 ? (uArea / sArea) * 100 : 0;

    totalStockArea += sArea;
    totalUsedArea += uArea;
    totalCuts += sheet.cutsCount;

    return {
      sheetIndex: index + 1,
      stockType: sheet.stockType,
      length: sheet.length,
      width: sheet.width,
      placedPieces: sheet.placedPieces,
      usedArea: parseFloat(uArea.toFixed(3)),
      wasteArea: parseFloat(wasteArea.toFixed(3)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      cutsCount: sheet.cutsCount,
    };
  });

  const totalRequiredArea = requiredPieces.reduce(
    (acc, p) => acc + (p.length * p.width * p.quantity) / 1_000_000,
    0
  );
  const totalWasteArea = Math.max(0, totalStockArea - totalUsedArea);
  const efficiencyPercent =
    totalStockArea > 0 ? (totalUsedArea / totalStockArea) * 100 : 0;
  const totalSeamsCount = joinedDiagrams.reduce(
    (acc, d) => acc + d.seamCount,
    0
  );

  return {
    stockSheetsUsed,
    joinedPieces: joinedDiagrams,
    summary: {
      totalStockSheets: stockSheetsUsed.length,
      sheetBreakdown,
      totalRequiredArea: parseFloat(totalRequiredArea.toFixed(3)),
      totalStockArea: parseFloat(totalStockArea.toFixed(3)),
      totalUsedArea: parseFloat(totalUsedArea.toFixed(3)),
      totalWasteArea: parseFloat(totalWasteArea.toFixed(3)),
      efficiencyPercent: parseFloat(efficiencyPercent.toFixed(1)),
      totalCutsCount: totalCuts,
      totalSeamsCount,
    },
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run test -- src/lib/__tests__/woodCuttingOptimizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts; git commit -m "feat: implement 2D guillotine cutting stock optimizer with tests"
```

---

### Task 5: Component Sơ Đồ Cắt SVG Trực Quan (Interactive Cutting & Joining Diagrams)

**Files:**
- Create: `src/components/wood-cut/CuttingDiagram.tsx`
- Create: `src/components/wood-cut/JoinedPieceDiagramView.tsx`

**Interfaces:**
- Consumes: `PlacedStockSheet`, `JoinedPieceDiagram` from `src/types/woodCut.ts`
- Produces: `CuttingDiagram` (vẽ SVG từng tấm ván gốc có zoom/pan và tỷ lệ chuẩn), `JoinedPieceDiagramView` (vẽ sơ đồ ghép tấm lớn chỉ rõ đường nối seam).

- [ ] **Step 1: Cài đặt component `CuttingDiagram.tsx`**

```tsx
// src/components/wood-cut/CuttingDiagram.tsx
"use client";

import React, { useState } from "react";
import { PlacedStockSheet, PlacedPiece } from "@/types/woodCut";

interface Props {
  sheet: PlacedStockSheet;
}

export default function CuttingDiagram({ sheet }: Props) {
  const [hoveredPiece, setHoveredPiece] = useState<PlacedPiece | null>(null);

  // Tính toán viewBox theo tỷ lệ
  const padding = 40;
  const viewBoxWidth = sheet.length + padding * 2;
  const viewBoxHeight = sheet.width + padding * 2;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-600 text-white font-bold text-xs">
            {sheet.sheetIndex}
          </span>
          <h3 className="text-sm font-bold text-slate-800">
            Tấm ván gốc #{sheet.sheetIndex} ({sheet.length} × {sheet.width} mm)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            Hiệu suất: {sheet.efficiency}%
          </span>
          <span className="text-slate-500">
            Chi tiết: <strong className="text-slate-700">{sheet.placedPieces.length}</strong>
          </span>
        </div>
      </div>

      {/* SVG Sơ đồ cắt */}
      <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-center p-2">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto max-h-[360px] drop-shadow-sm select-none"
        >
          {/* Tấm ván gốc nền */}
          <rect
            x={padding}
            y={padding}
            width={sheet.length}
            height={sheet.width}
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth={2}
            rx={4}
          />

          {/* Các chi tiết cắt */}
          {sheet.placedPieces.map((piece) => {
            const isHovered = hoveredPiece?.id === piece.id;
            const px = padding + piece.x;
            const py = padding + piece.y;

            return (
              <g
                key={piece.id}
                onMouseEnter={() => setHoveredPiece(piece)}
                onMouseLeave={() => setHoveredPiece(null)}
                className="cursor-pointer transition-all duration-150"
              >
                {/* Hình chữ nhật chi tiết */}
                <rect
                  x={px}
                  y={py}
                  width={piece.length}
                  height={piece.width}
                  fill={piece.color}
                  fillOpacity={isHovered ? 0.95 : 0.75}
                  stroke={isHovered ? "#4338ca" : "#64748b"}
                  strokeWidth={isHovered ? 2.5 : 1}
                  rx={2}
                />

                {/* Nhãn chữ kích thước & tên */}
                {piece.length > 80 && piece.width > 40 && (
                  <text
                    x={px + piece.length / 2}
                    y={py + piece.width / 2 - (piece.width > 70 ? 8 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#1e1b4b"
                    fontSize={Math.min(18, Math.max(10, piece.width / 6))}
                    fontWeight="700"
                  >
                    {piece.name}
                  </text>
                )}
                {piece.length > 80 && piece.width > 60 && (
                  <text
                    x={px + piece.length / 2}
                    y={py + piece.width / 2 + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#312e81"
                    fontSize={Math.min(14, Math.max(9, piece.width / 8))}
                    fontWeight="600"
                  >
                    {piece.length} × {piece.width} mm {piece.rotated ? "⟲" : ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip Hover thông tin chi tiết */}
      {hoveredPiece && (
        <div className="mt-2 text-xs text-slate-700 bg-violet-50/80 border border-violet-100 rounded-lg p-2 flex items-center justify-between">
          <span>
            Đang chọn: <strong>{hoveredPiece.name}</strong> ({hoveredPiece.length} × {hoveredPiece.width} mm)
            {hoveredPiece.rotated && <span className="ml-1 text-violet-600 font-bold">(Đã xoay 90°)</span>}
          </span>
          <span className="text-slate-500 text-[11px]">Tọa độ: ({hoveredPiece.x}, {hoveredPiece.y})</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Cài đặt component `JoinedPieceDiagramView.tsx`**

```tsx
// src/components/wood-cut/JoinedPieceDiagramView.tsx
"use client";

import React from "react";
import { JoinedPieceDiagram } from "@/types/woodCut";

interface Props {
  diagram: JoinedPieceDiagram;
}

export default function JoinedPieceDiagramView({ diagram }: Props) {
  const padding = 30;
  const viewBoxWidth = diagram.targetLength + padding * 2;
  const viewBoxHeight = diagram.targetWidth + padding * 2;

  return (
    <div className="bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-200/80 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 border-b border-amber-200/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧩</span>
          <h4 className="text-sm font-bold text-amber-900">
            Sơ đồ ghép: {diagram.parentName} ({diagram.targetLength} × {diagram.targetWidth} mm)
          </h4>
        </div>
        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
          {diagram.subPieces.length} tấm con ({diagram.seamCount} mối nối)
        </span>
      </div>

      <div className="w-full bg-white/80 rounded-xl border border-amber-200/60 p-2 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto max-h-[220px] select-none"
        >
          {/* Khung viền tấm lớn */}
          <rect
            x={padding}
            y={padding}
            width={diagram.targetLength}
            height={diagram.targetWidth}
            fill="#fef3c7"
            stroke="#d97706"
            strokeWidth={2}
            rx={4}
          />

          {/* Các tấm con ghép */}
          {diagram.subPieces.map((sp, idx) => {
            const px = padding + sp.relX;
            const py = padding + sp.relY;

            return (
              <g key={sp.id}>
                <rect
                  x={px}
                  y={py}
                  width={sp.length}
                  height={sp.width}
                  fill="#fde68a"
                  stroke="#b45309"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <text
                  x={px + sp.length / 2}
                  y={py + sp.width / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#78350f"
                  fontSize={Math.min(16, Math.max(10, sp.width / 5))}
                  fontWeight="700"
                >
                  Tấm ghép #{idx + 1} ({sp.length} × {sp.width})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/wood-cut/CuttingDiagram.tsx src/components/wood-cut/JoinedPieceDiagramView.tsx; git commit -m "feat: add interactive SVG diagrams for stock sheets and joined pieces"
```

---

### Task 6: Các Component Nhập Liệu & Thống Kê (Inputs & Summary BOM)

**Files:**
- Create: `src/components/wood-cut/StockSheetForm.tsx`
- Create: `src/components/wood-cut/RequiredPiecesForm.tsx`
- Create: `src/components/wood-cut/WoodCutSummary.tsx`

**Interfaces:**
- Consumes: Models from `src/types/woodCut.ts`, `parseRequiredPiecesText`, `formatPiecesToText`
- Produces: Visual glass-card input panels and summary metrics.

- [ ] **Step 1: Tạo `StockSheetForm.tsx`**

```tsx
// src/components/wood-cut/StockSheetForm.tsx
"use client";

import React from "react";
import { StockSheetInput, CalculationConfig } from "@/types/woodCut";

interface Props {
  stockSheets: StockSheetInput[];
  setStockSheets: (sheets: StockSheetInput[]) => void;
  config: CalculationConfig;
  setConfig: (config: CalculationConfig) => void;
}

export default function StockSheetForm({ stockSheets, setStockSheets, config, setConfig }: Props) {
  const addPreset = (length: number, width: number, name: string) => {
    setStockSheets([
      ...stockSheets,
      { id: `s-${Date.now()}`, name, length, width }
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
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
            Lưỡi cưa (Kerf):
            <input
              type="number"
              min="0"
              max="20"
              value={config.kerf}
              onChange={(e) => setConfig({ ...config, kerf: parseFloat(e.target.value) || 0 })}
              className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400"
            />
            mm
          </label>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[11px] text-slate-400 self-center">Chọn nhanh:</span>
        <button
          type="button"
          onClick={() => addPreset(1200, 600, "Ván 1200x600")}
          className="text-xs px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg border border-violet-200 transition-all font-medium"
        >
          + 1200 × 600
        </button>
        <button
          type="button"
          onClick={() => addPreset(2440, 1220, "Ván chuẩn 2440x1220")}
          className="text-xs px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg border border-violet-200 transition-all font-medium"
        >
          + 2440 × 1220
        </button>
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
              <input
                type="number"
                value={s.length}
                onChange={(e) => handleUpdate(s.id, "length", Math.max(1, parseInt(e.target.value) || 0))}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Dài"
              />
              <span className="text-slate-400 text-xs">×</span>
              <input
                type="number"
                value={s.width}
                onChange={(e) => handleUpdate(s.id, "width", Math.max(1, parseInt(e.target.value) || 0))}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Rộng"
              />
              <span className="text-slate-400 text-[10px]">mm</span>
            </div>
            {stockSheets.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                title="Xóa ván gốc này"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tạo `RequiredPiecesForm.tsx`**

```tsx
// src/components/wood-cut/RequiredPiecesForm.tsx
"use client";

import React, { useState } from "react";
import { RequiredPieceInput } from "@/types/woodCut";
import { parseRequiredPiecesText, formatPiecesToText } from "@/lib/woodCutParser";

interface Props {
  pieces: RequiredPieceInput[];
  setPieces: (pieces: RequiredPieceInput[]) => void;
  onCalculate: () => void;
}

export default function RequiredPiecesForm({ pieces, setPieces, onCalculate }: Props) {
  const [mode, setMode] = useState<"table" | "batch">("table");
  const [batchText, setBatchText] = useState("");
  const [batchErrors, setBatchErrors] = useState<string[]>([]);

  const handleAddRow = () => {
    setPieces([
      ...pieces,
      {
        id: `p-${Date.now()}`,
        name: `Tấm ${pieces.length + 1}`,
        length: 500,
        width: 300,
        quantity: 1,
        allowRotation: true,
      },
    ]);
  };

  const handleUpdate = (id: string, field: keyof RequiredPieceInput, val: any) => {
    setPieces(pieces.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const handleRemove = (id: string) => {
    if (pieces.length <= 1) return;
    setPieces(pieces.filter((p) => p.id !== id));
  };

  const handleApplyBatch = () => {
    const { pieces: parsed, errors } = parseRequiredPiecesText(batchText);
    setBatchErrors(errors);
    if (parsed.length > 0) {
      setPieces(parsed);
      setMode("table");
    }
  };

  const handleOpenBatch = () => {
    setBatchText(formatPiecesToText(pieces));
    setBatchErrors([]);
    setMode("batch");
  };

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4">
      {/* Header Tabs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📐</span> Mặt Gỗ Cần Làm ({pieces.length} loại)
        </h2>
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setMode("table")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === "table" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Bảng nhập
          </button>
          <button
            type="button"
            onClick={handleOpenBatch}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === "batch" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Nhập nhanh (Paste)
          </button>
        </div>
      </div>

      {mode === "batch" ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Dán danh sách kích thước (mỗi dòng một tấm, định dạng <code>1110, 1230</code> hoặc <code>234x234 x2</code>):
          </p>
          <textarea
            rows={7}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder="1110, 1230&#10;234, 234&#10;500x600 x2"
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50"
          />
          {batchErrors.length > 0 && (
            <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
              {batchErrors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("table")}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApplyBatch}
              className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-sm"
            >
              Áp dụng vào bảng
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {pieces.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100 hover:border-violet-200 transition-all"
            >
              <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
              <input
                type="text"
                value={p.name}
                onChange={(e) => handleUpdate(p.id, "name", e.target.value)}
                placeholder="Tên chi tiết"
                className="flex-1 min-w-[90px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-violet-400"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={p.length}
                  onChange={(e) => handleUpdate(p.id, "length", Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                  placeholder="Dài"
                />
                <span className="text-slate-400 text-xs">×</span>
                <input
                  type="number"
                  value={p.width}
                  onChange={(e) => handleUpdate(p.id, "width", Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                  placeholder="Rộng"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">SL:</span>
                <input
                  type="number"
                  min="1"
                  value={p.quantity}
                  onChange={(e) => handleUpdate(p.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
                />
              </div>
              <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer" title="Cho phép xoay 90° để tối ưu ván">
                <input
                  type="checkbox"
                  checked={p.allowRotation}
                  onChange={(e) => handleUpdate(p.id, "allowRotation", e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-400"
                />
                Xoay
              </label>
              {pieces.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                  title="Xóa dòng"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 transition-all flex items-center gap-1"
            >
              + Thêm mặt gỗ
            </button>
            <button
              type="button"
              onClick={onCalculate}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <span>⚡</span> Tính Toán Cắt Ván
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Tạo `WoodCutSummary.tsx`**

```tsx
// src/components/wood-cut/WoodCutSummary.tsx
"use client";

import React from "react";
import { CalculationResult } from "@/types/woodCut";

interface Props {
  result: CalculationResult | null;
}

export default function WoodCutSummary({ result }: Props) {
  if (!result || result.stockSheetsUsed.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        <span className="text-3xl block mb-2">🪚</span>
        <p className="text-sm font-semibold">Chưa có kết quả tính toán</p>
        <p className="text-xs text-slate-400 mt-1">
          Nhập kích thước ván gốc và các mặt gỗ cần làm ở bên trái, sau đó nhấn <strong>"Tính Toán Cắt Ván"</strong>.
        </p>
      </div>
    );
  }

  const { summary } = result;

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📊</span> Tổng Hợp Vật Tư Cần Mua (BOM)
        </h3>
        <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
          Tổng cộng: {summary.totalStockSheets} tấm ván gốc
        </span>
      </div>

      {/* Grid thẻ chỉ số */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-violet-50/70 border border-violet-100 rounded-xl p-2.5">
          <div className="text-[11px] text-violet-600 font-semibold">Ván gốc cần mua</div>
          <div className="text-lg font-extrabold text-violet-900 mt-0.5">
            {summary.totalStockSheets} <span className="text-xs font-normal">tấm</span>
          </div>
          <div className="text-[10px] text-violet-500 mt-0.5">
            {Object.entries(summary.sheetBreakdown).map(([k, v]) => `${v} × ${k}`).join(", ")}
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
          <div className="text-[11px] text-emerald-600 font-semibold">Hiệu suất sử dụng</div>
          <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
            {summary.efficiencyPercent}%
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            Dùng: {summary.totalUsedArea} m² / {summary.totalStockArea} m²
          </div>
        </div>

        <div className="bg-orange-50/70 border border-orange-100 rounded-xl p-2.5">
          <div className="text-[11px] text-orange-600 font-semibold">Hao phí / Gỗ thừa</div>
          <div className="text-lg font-extrabold text-orange-900 mt-0.5">
            {summary.totalWasteArea} <span className="text-xs font-normal">m²</span>
          </div>
          <div className="text-[10px] text-orange-500 mt-0.5">
            Tận dụng làm mẩu nhỏ
          </div>
        </div>

        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2.5">
          <div className="text-[11px] text-sky-600 font-semibold">Số đường cắt & Ghép</div>
          <div className="text-lg font-extrabold text-sky-900 mt-0.5">
            {summary.totalCutsCount} <span className="text-xs font-normal">nhát cắt</span>
          </div>
          <div className="text-[10px] text-sky-600 mt-0.5">
            {summary.totalSeamsCount > 0 ? `${summary.totalSeamsCount} mối nối tấm lớn` : "Không cần ghép"}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/wood-cut/StockSheetForm.tsx src/components/wood-cut/RequiredPiecesForm.tsx src/components/wood-cut/WoodCutSummary.tsx; git commit -m "feat: add input forms and summary BOM components"
```

---

### Task 7: Tạo Trang `/wood-cut` & Cập Nhật Nút Chuyển Đổi Trên Header Board

**Files:**
- Create: `src/app/wood-cut/page.tsx`
- Modify: `src/app/board/[id]/page.tsx:735-743`

**Interfaces:**
- Consumes: All `wood-cut` components, `calculateWoodCut`
- Produces: Complete wood cutting optimizer page with LocalStorage persistence and navigation.

- [ ] **Step 1: Tạo `src/app/wood-cut/page.tsx`**

```tsx
// src/app/wood-cut/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StockSheetInput, RequiredPieceInput, CalculationConfig, CalculationResult } from "@/types/woodCut";
import { calculateWoodCut } from "@/lib/woodCuttingOptimizer";
import StockSheetForm from "@/components/wood-cut/StockSheetForm";
import RequiredPiecesForm from "@/components/wood-cut/RequiredPiecesForm";
import WoodCutSummary from "@/components/wood-cut/WoodCutSummary";
import CuttingDiagram from "@/components/wood-cut/CuttingDiagram";
import JoinedPieceDiagramView from "@/components/wood-cut/JoinedPieceDiagramView";

const STORAGE_KEY = "wood_cutting_calculator_state_v1";

const INITIAL_STOCK: StockSheetInput[] = [
  { id: "s-1", name: "Ván 1200x600", length: 1200, width: 600 },
];

const INITIAL_PIECES: RequiredPieceInput[] = [
  { id: "p-1", name: "Mặt bàn lớn", length: 1110, width: 1230, quantity: 1, allowRotation: true },
  { id: "p-2", name: "Tấm vuông nhỏ", length: 234, width: 234, quantity: 1, allowRotation: true },
];

const INITIAL_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};

export default function WoodCutPage() {
  const [stockSheets, setStockSheets] = useState<StockSheetInput[]>(INITIAL_STOCK);
  const [pieces, setPieces] = useState<RequiredPieceInput[]>(INITIAL_PIECES);
  const [config, setConfig] = useState<CalculationConfig>(INITIAL_CONFIG);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [lastBoardId, setLastBoardId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stockSheets) setStockSheets(parsed.stockSheets);
        if (parsed.pieces) setPieces(parsed.pieces);
        if (parsed.config) setConfig(parsed.config);
      }
      const savedBoard = localStorage.getItem("last_active_board_id");
      if (savedBoard) setLastBoardId(savedBoard);
    } catch (e) {
      console.error("Lỗi đọc localStorage:", e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stockSheets, pieces, config })
      );
    } catch (e) {
      console.error("Lỗi ghi localStorage:", e);
    }
  }, [stockSheets, pieces, config]);

  const handleCalculate = () => {
    const res = calculateWoodCut(stockSheets, pieces, config);
    setResult(res);
  };

  // Tính toán tự động lần đầu
  useEffect(() => {
    handleCalculate();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] flex flex-col">
      {/* Header */}
      <header className="px-6 py-3.5 bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-sm">
            🪚
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 leading-tight">
              Tối Ưu Cắt & Ghép Ván Gỗ
            </h1>
            <p className="text-[11px] text-slate-500">
              Tự động tính toán số ván gốc cần mua, ghép tấm lớn & sơ đồ cắt trực quan
            </p>
          </div>
        </div>

        {/* Nút quay lại Workspace ở góc trên phải */}
        <div className="flex items-center gap-3">
          <Link
            href={lastBoardId ? `/board/${lastBoardId}` : "/"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-50/80 hover:bg-violet-100 text-violet-700 border border-violet-200/80 rounded-xl font-bold text-xs transition-all shadow-sm hover:scale-[1.02]"
          >
            <span>📋</span> Quản lý công việc
          </Link>
          <div className="text-xs font-bold text-violet-700 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            ✨ HTPhongNAThy
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <StockSheetForm
            stockSheets={stockSheets}
            setStockSheets={setStockSheets}
            config={config}
            setConfig={setConfig}
          />
          <RequiredPiecesForm
            pieces={pieces}
            setPieces={setPieces}
            onCalculate={handleCalculate}
          />
        </div>

        {/* Right Column: Results & Diagrams (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <WoodCutSummary result={result} />

          {/* Sơ đồ ghép tấm lớn nếu có */}
          {result && result.joinedPieces.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🧩</span> Sơ Đồ Ghép Các Mặt Gỗ Vượt Khổ ({result.joinedPieces.length})
              </h3>
              {result.joinedPieces.map((diagram) => (
                <JoinedPieceDiagramView key={diagram.parentId} diagram={diagram} />
              ))}
            </div>
          )}

          {/* Sơ đồ cắt từng tấm ván gốc */}
          {result && result.stockSheetsUsed.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📐</span> Sơ Đồ Cắt Từng Tấm Ván Gốc ({result.stockSheetsUsed.length} tấm)
              </h3>
              <div className="space-y-4">
                {result.stockSheetsUsed.map((sheet) => (
                  <CuttingDiagram key={sheet.sheetIndex} sheet={sheet} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Thêm nút chuyển đổi sang `/wood-cut` tại header `src/app/board/[id]/page.tsx`**

Tại dòng 738-742 của `src/app/board/[id]/page.tsx`, lưu `last_active_board_id` và bổ sung Link `[ 🪚 Tính ván gỗ ]` cạnh badge `✨ HTPhongNAThy`:

```tsx
<div className="flex items-center gap-2">
  <Link
    href="/wood-cut"
    onClick={() => {
      if (typeof window !== "undefined" && boardId) {
        localStorage.setItem("last_active_board_id", boardId as string);
      }
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50/80 hover:bg-violet-100 text-violet-700 border border-violet-200/80 rounded-xl font-bold text-xs transition-all shadow-sm hover:scale-[1.02]"
  >
    <span>🪚</span> Tính ván gỗ
  </Link>
  <div className="text-xs font-bold text-violet-700 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
    ✨ HTPhongNAThy
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/wood-cut/page.tsx src/app/board/[id]/page.tsx; git commit -m "feat: add wood-cut page and navigation button in board header"
```

---

### Task 8: Kiểm Thử Toàn Diện & Xác Thực Hệ Thống (Integration & Build)

**Files:**
- Create: `src/__tests__/woodCutIntegration.test.ts`

- [ ] **Step 1: Viết test tích hợp end-to-end cho luồng tính toán**

```typescript
// src/__tests__/woodCutIntegration.test.ts
import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText } from "@/lib/woodCutParser";
import { calculateWoodCut } from "@/lib/woodCuttingOptimizer";
import { StockSheetInput } from "@/types/woodCut";

describe("Wood Cut System Integration", () => {
  it("executes full workflow from raw user input to final cutting diagrams", () => {
    // 1. Raw user input
    const rawInput = `
      1110, 1230
      234,   234
    `;
    const { pieces, errors } = parseRequiredPiecesText(rawInput);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(2);

    // 2. Stock sheets
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1200, width: 600 }
    ];

    // 3. Optimize
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });

    // 4. Assertions
    expect(result.stockSheetsUsed.length).toBeGreaterThanOrEqual(3);
    expect(result.joinedPieces.length).toBe(1); // 1110x1230 cần ghép
    expect(result.summary.totalStockSheets).toBe(result.stockSheetsUsed.length);
    expect(result.summary.efficiencyPercent).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Chạy toàn bộ test suite**

Run: `npm run test`
Expected: ALL PASS

- [ ] **Step 3: Chạy build kiểm tra Next.js**

Run: `npm run build`
Expected: Build thành công không có lỗi TypeScript hay ESLint

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/woodCutIntegration.test.ts; git commit -m "test: add integration test for full wood cut workflow"
```
