# Wood Cut: Exact DP Mode & 3-Way Piece Orientation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3-way piece orientation selection (`auto`, `vertical`, `horizontal`), batch paste tag support (`!doc`, `!ngang`, `!xoay`), and exact Dynamic Programming (DP) algorithm mode toggle to the Wood Cutting Calculator (`/wood-cut`).

**Architecture:** Extend core types to support `PieceOrientation`, update `woodCutParser` to parse and format orientation tags, update `woodDecomposer`, `woodCuttingOptimizer`, and `dpGroundTruthOptimizer` to honor directional constraints, and update UI components with a 3-way orientation `<select>` and exact DP switch.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Jest.

## Global Constraints
- Do NOT break backward compatibility for existing saved projects in `localStorage` (`allowRotation` boolean fallback).
- Keep real-time calculation fast (< 10ms for heuristic).
- All tests must pass with zero TypeScript errors.

---

### Task 1: Update Data Model & Types

**Files:**
- Modify: `src/types/woodCut.ts`

**Interfaces:**
- Produces:
  - `export type PieceOrientation = "auto" | "vertical" | "horizontal";`
  - `RequiredPieceInput.orientation: PieceOrientation`
  - `CalculationConfig.useExactDP?: boolean`
  - `SubPiece.orientation?: PieceOrientation`

- [ ] **Step 1: Update `src/types/woodCut.ts`**

Update `src/types/woodCut.ts` to add `PieceOrientation` and update `RequiredPieceInput`, `CalculationConfig`, and `SubPiece`.

```typescript
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
  orientation?: PieceOrientation; // "auto" | "vertical" | "horizontal"
  allowRotation?: boolean;        // true if orientation === "auto", false otherwise
}

export interface CalculationConfig {
  kerf: number;            // Độ dày mạch cưa (mm), mặc định 3mm
  minSubPieceSize: number; // Kích thước tối thiểu của tấm ghép (mm), mặc định 50mm
  useExactDP?: boolean;    // true = dùng Quy hoạch động chính xác tuyệt đối
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
  stockSheetIndex?: number;
}
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npx tsc --noEmit`
Expected: PASS (or minor warnings in consumers that will be addressed in next tasks)

- [ ] **Step 3: Commit**

```bash
git add src/types/woodCut.ts
git commit -m "feat(wood-cut): add PieceOrientation and useExactDP config to types"
```

---

### Task 2: Wood Cut Parser & Formatter (TDD)

**Files:**
- Modify: `src/lib/woodCutParser.ts`
- Test: `src/lib/__tests__/woodCutParser.test.ts`

**Interfaces:**
- Consumes: `PieceOrientation`, `RequiredPieceInput` from `src/types/woodCut.ts`
- Produces: `parseRequiredPiecesText`, `formatPiecesToText`

- [ ] **Step 1: Write failing tests for 3-way orientation tags in `src/lib/__tests__/woodCutParser.test.ts`**

```typescript
import { parseRequiredPiecesText, formatPiecesToText } from "../woodCutParser";

describe("woodCutParser orientation tags", () => {
  it("parses vertical orientation tags correctly", () => {
    const input = `1110, 1230 !doc\n500x600 x2 !d\n400 800 !v\n300, 300 !r`;
    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(4);
    expect(pieces[0].orientation).toBe("vertical");
    expect(pieces[0].allowRotation).toBe(false);
    expect(pieces[1].orientation).toBe("vertical");
    expect(pieces[2].orientation).toBe("vertical");
    expect(pieces[3].orientation).toBe("vertical");
  });

  it("parses horizontal orientation tags correctly", () => {
    const input = `1110, 1230 !ngang\n500x600 x2 !n\n400 800 !h`;
    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(3);
    expect(pieces[0].orientation).toBe("horizontal");
    expect(pieces[0].allowRotation).toBe(false);
    expect(pieces[1].orientation).toBe("horizontal");
    expect(pieces[2].orientation).toBe("horizontal");
  });

  it("parses auto / rotation allowed by default and with !xoay / !auto", () => {
    const input = `1110, 1230\n500x600 !xoay\n400 800 !auto`;
    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(3);
    expect(pieces[0].orientation).toBe("auto");
    expect(pieces[0].allowRotation).toBe(true);
    expect(pieces[1].orientation).toBe("auto");
    expect(pieces[2].orientation).toBe("auto");
  });

  it("formats pieces to text with correct orientation tags", () => {
    const pieces = [
      { id: "1", name: "P1", length: 1110, width: 1230, quantity: 1, orientation: "vertical" as const, allowRotation: false },
      { id: "2", name: "P2", length: 500, width: 600, quantity: 2, orientation: "horizontal" as const, allowRotation: false },
      { id: "3", name: "P3", length: 400, width: 800, quantity: 1, orientation: "auto" as const, allowRotation: true },
    ];
    const text = formatPiecesToText(pieces);
    expect(text).toContain("1110, 1230 !doc");
    expect(text).toContain("500, 600, 2 !ngang");
    expect(text).toContain("400, 800");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/woodCutParser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement parser changes in `src/lib/woodCutParser.ts`**

Update `src/lib/woodCutParser.ts` to parse tags and set both `orientation` and `allowRotation`.

```typescript
import { RequiredPieceInput, PieceOrientation } from "@/types/woodCut";

const VERTICAL_REGEX = /(?:^|\s+)(!doc|!d|!v|!r|norot|no-rot|lock|r=0|r:0|rot=0)(?:\s+|$)/i;
const HORIZONTAL_REGEX = /(?:^|\s+)(!ngang|!n|!h|!horiz|!horizontal)(?:\s+|$)/i;
const AUTO_REGEX = /(?:^|\s+)(!xoay|!auto|!rot|r=1|r:1|rot=1)(?:\s+|$)/i;

export function parseRequiredPiecesText(text: string): { pieces: RequiredPieceInput[]; errors: string[] } {
  const lines = text.split("\n");
  const pieces: RequiredPieceInput[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    let orientation: PieceOrientation = "auto";

    if (VERTICAL_REGEX.test(trimmed)) {
      orientation = "vertical";
      trimmed = trimmed.replace(VERTICAL_REGEX, " ").trim();
    } else if (HORIZONTAL_REGEX.test(trimmed)) {
      orientation = "horizontal";
      trimmed = trimmed.replace(HORIZONTAL_REGEX, " ").trim();
    } else if (AUTO_REGEX.test(trimmed)) {
      orientation = "auto";
      trimmed = trimmed.replace(AUTO_REGEX, " ").trim();
    }

    const allowRotation = orientation === "auto";

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
      orientation,
      allowRotation,
    });
  });

  return { pieces, errors };
}

export function formatPiecesToText(pieces: RequiredPieceInput[]): string {
  return pieces
    .map((p) => {
      let tag = "";
      const orient = p.orientation || (p.allowRotation === false ? "vertical" : "auto");
      if (orient === "vertical") tag = " !doc";
      else if (orient === "horizontal") tag = " !ngang";

      return `${p.length}, ${p.width}${p.quantity > 1 ? `, ${p.quantity}` : ""}${tag}`;
    })
    .join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/woodCutParser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/woodCutParser.ts src/lib/__tests__/woodCutParser.test.ts
git commit -m "feat(wood-cut): support 3-way orientation tags in parser and formatter"
```

---

### Task 3: Update Decomposer & Optimizers (Heuristic & DP)

**Files:**
- Modify: `src/lib/woodDecomposer.ts`
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Modify: `src/lib/cp/dpGroundTruthOptimizer.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`

**Interfaces:**
- Consumes: `PieceOrientation`, `RequiredPieceInput`, `SubPiece`
- Produces: Correct decomposed subpieces and guillotine placement respecting `vertical`, `horizontal`, `auto`.

- [ ] **Step 1: Write tests for directional orientation in `src/lib/__tests__/woodCuttingOptimizer.test.ts`**

Add unit tests to verify:
1. `vertical` pieces are strictly placed unrotated ($L \times W$).
2. `horizontal` pieces are strictly placed rotated ($W \times L$).
3. `auto` pieces can be rotated if beneficial.

- [ ] **Step 2: Update `src/lib/woodDecomposer.ts`**

Update `findOptimalDecomposition`:
- When `orientation === "vertical"`: only candidate orientation is $[(L, W)]$.
- When `orientation === "horizontal"`: only candidate orientation is $[(W, L)]$.
- When `orientation === "auto"`: candidate orientations are $[(L, W), (W, L)]$.
- Set `subPiece.orientation` and `subPiece.allowRotation` according to parent orientation.

- [ ] **Step 3: Update `src/lib/woodCuttingOptimizer.ts`**

In `packCandidate`:
Determine allowed dimensions for item:
```typescript
const orient = item.orientation || (item.allowRotation === false ? "vertical" : "auto");
const orientations: { w: number; h: number; rotated: boolean }[] = [];

if (orient === "vertical") {
  orientations.push({ w: item.length, h: item.width, rotated: false });
} else if (orient === "horizontal") {
  orientations.push({ w: item.width, h: item.length, rotated: true });
} else {
  orientations.push({ w: item.length, h: item.width, rotated: false });
  if (item.length !== item.width) {
    orientations.push({ w: item.width, h: item.length, rotated: true });
  }
}
```

- [ ] **Step 4: Update `src/lib/cp/dpGroundTruthOptimizer.ts`**

In `tryFitSingleSheetGuillotine`:
Respect `item.orientation`:
```typescript
const orient = item.orientation || (item.allowRotation === false ? "vertical" : "auto");
const orientations: { w: number; h: number; rotated: boolean }[] = [];

if (orient === "vertical") {
  orientations.push({ w: item.length, h: item.width, rotated: false });
} else if (orient === "horizontal") {
  orientations.push({ w: item.width, h: item.length, rotated: true });
} else {
  orientations.push({ w: item.length, h: item.width, rotated: false });
  if (item.length !== item.width) {
    orientations.push({ w: item.width, h: item.length, rotated: true });
  }
}
```

- [ ] **Step 5: Run tests to verify**

Run: `npm test -- src/lib/__tests__/woodCuttingOptimizer.test.ts src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/woodDecomposer.ts src/lib/woodCuttingOptimizer.ts src/lib/cp/dpGroundTruthOptimizer.ts src/lib/__tests__/woodCuttingOptimizer.test.ts
git commit -m "feat(wood-cut): enforce vertical, horizontal, auto constraints in decomposer and optimizers"
```

---

### Task 4: UI Updates (3-Way Dropdown & Exact DP Switch)

**Files:**
- Modify: `src/components/wood-cut/RequiredPiecesForm.tsx`
- Modify: `src/components/wood-cut/StockSheetForm.tsx`
- Modify: `src/app/wood-cut/page.tsx`
- Test: `src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx`

**Interfaces:**
- Consumes: `PieceOrientation`, `CalculationConfig.useExactDP`
- Produces: Responsive UI with Option A select dropdown for orientations, bulk orientation action, and DP mode toggle.

- [ ] **Step 1: Update `RequiredPiecesForm.tsx`**

1. Replace checkbox with `<select>` dropdown (Option A):
```tsx
<select
  value={p.orientation || (p.allowRotation === false ? "vertical" : "auto")}
  onChange={(e) => {
    const orient = e.target.value as PieceOrientation;
    handleUpdate(p.id, "orientation", orient);
    handleUpdate(p.id, "allowRotation", orient === "auto");
  }}
  className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 outline-none focus:border-violet-400 cursor-pointer shadow-sm"
>
  <option value="auto">🔄 Tự do xoay</option>
  <option value="vertical">↕️ Để dọc</option>
  <option value="horizontal">↔️ Để ngang</option>
</select>
```
2. Update batch placeholder and helper text with `!doc` and `!ngang`.
3. Update bulk orientation toggle / dropdown in header.

- [ ] **Step 2: Add Exact DP Mode Switch in `StockSheetForm.tsx` or Header Config**

Add a clean toggle in the settings / config bar:
```tsx
<label className="flex items-center gap-2 cursor-pointer select-none">
  <input
    type="checkbox"
    checked={config.useExactDP === true}
    onChange={(e) => setConfig({ ...config, useExactDP: e.target.checked })}
    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400 accent-violet-600 cursor-pointer"
  />
  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
    <span>🎯</span> Dùng thuật toán chính xác (DP)
    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">100% Tối ưu</span>
  </span>
</label>
```

- [ ] **Step 3: Update `src/app/wood-cut/page.tsx` Calculation Router**

```typescript
const handleCalculate = () => {
  if (config.useExactDP) {
    const res = solveGroundTruthDP(stockSheets, pieces, config);
    setResult(res);
  } else {
    const res = calculateWoodCut(stockSheets, pieces, config);
    setResult(res);
  }
};
```

- [ ] **Step 4: Run component tests**

Run: `npm test -- src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/wood-cut/RequiredPiecesForm.tsx src/components/wood-cut/StockSheetForm.tsx src/app/wood-cut/page.tsx src/components/wood-cut/__tests__/RequiredPiecesForm.test.tsx
git commit -m "feat(wood-cut): add 3-way orientation select and exact DP algorithm toggle to UI"
```

---

### Task 5: End-to-End Integration & Build Verification

**Files:**
- Modify: `src/__tests__/woodCutIntegration.test.ts`

- [ ] **Step 1: Add integration test for image test case with orientations & DP mode**

Add integration test testing the 6 pieces with different orientations and validating both Heuristic and DP calculate cleanly without error.

- [ ] **Step 2: Run all tests and build check**

Run:
```bash
npm test
npm run build
```
Expected: All test suites PASS, production build succeeds with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/woodCutIntegration.test.ts
git commit -m "test(wood-cut): verify 3-way orientation and DP mode integration"
```
