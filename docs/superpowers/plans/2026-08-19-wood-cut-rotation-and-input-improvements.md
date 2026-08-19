# Wood-Cut Rotation Assumption & Numeric Input Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix dimension/quantity input trapping bug on `/wood-cut` page by introducing a `<NumericInput />` component, and assume all wood pieces can be rotated 90° for optimal cutting by removing the rotation checkbox.

**Architecture:**
- Create a reusable, controlled `<NumericInput />` component in `src/components/wood-cut/NumericInput.tsx` that maintains an internal string buffer allowing empty states during active editing and falls back gracefully to default values on blur.
- Update `RequiredPiecesForm.tsx` and `StockSheetForm.tsx` to use `<NumericInput />` and remove the rotation checkbox column.
- Update `woodCuttingOptimizer.ts`, `woodDecomposer.ts`, and `woodCutParser.ts` to sanitize input arrays and treat rotation as always enabled.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints
- Do not introduce breaking type changes to existing `types/woodCut.ts`.
- Ensure all existing tests in `src/lib/__tests__/` and `src/__tests__/` continue to pass.
- Maintain responsive, clean UI matching the existing Tailwind styling.

---

### Task 1: Create `NumericInput` Component with TDD

**Files:**
- Create: `src/components/wood-cut/NumericInput.tsx`
- Test: `src/components/wood-cut/__tests__/NumericInput.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export interface NumericInputProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    defaultValue?: number;
    placeholder?: string;
    className?: string;
    ariaLabel?: string;
    step?: number;
  }
  export default function NumericInput(props: NumericInputProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/components/wood-cut/__tests__/NumericInput.test.tsx`:
```tsx
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NumericInput from "../NumericInput";

describe("NumericInput", () => {
  it("renders with initial value", () => {
    render(<NumericInput value={1200} onChange={vi.fn()} min={1} defaultValue={100} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("1200");
  });

  it("allows clearing input completely without snapping to 1", () => {
    const handleChange = vi.fn();
    render(<NumericInput value={500} onChange={handleChange} min={1} defaultValue={100} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    // Does not fire invalid 0 / 1 while user is clearing
    expect(handleChange).not.toHaveBeenCalledWith(0);
  });

  it("allows typing new multi-digit numbers smoothly", () => {
    function ControlledWrapper() {
      const [val, setVal] = useState(1);
      return <NumericInput value={val} onChange={setVal} min={1} defaultValue={100} />;
    }
    render(<ControlledWrapper />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    // Clear and type 2233
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "2233" } });
    expect(input.value).toBe("2233");
  });

  it("falls back to defaultValue on blur if left empty", () => {
    const handleChange = vi.fn();
    render(<NumericInput value={500} onChange={handleChange} min={1} defaultValue={100} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("100");
    expect(handleChange).toHaveBeenCalledWith(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/wood-cut/__tests__/NumericInput.test.tsx`
Expected: FAIL (Cannot find module `../NumericInput`)

- [ ] **Step 3: Implement `NumericInput` component**

Create `src/components/wood-cut/NumericInput.tsx`:
```tsx
"use client";

import React, { useState, useEffect } from "react";

export interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  step?: number;
}

export default function NumericInput({
  value,
  onChange,
  min = 0,
  max,
  defaultValue = 1,
  placeholder,
  className = "",
  ariaLabel,
}: NumericInputProps) {
  const [localText, setLocalText] = useState<string>(
    value !== undefined && !isNaN(value) ? String(value) : ""
  );

  useEffect(() => {
    if (value !== undefined && !isNaN(value)) {
      setLocalText(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits only (or empty)
    const cleaned = raw.replace(/[^\d]/g, "");
    setLocalText(cleaned);

    if (cleaned !== "") {
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed)) {
        if (max !== undefined && parsed > max) {
          onChange(max);
        } else if (parsed >= min) {
          onChange(parsed);
        }
      }
    }
  };

  const handleBlur = () => {
    if (localText === "") {
      const fallback = defaultValue ?? min ?? 1;
      setLocalText(String(fallback));
      onChange(fallback);
      return;
    }

    const parsed = parseInt(localText, 10);
    if (isNaN(parsed) || parsed < min) {
      const fallback = defaultValue ?? min ?? 1;
      setLocalText(String(fallback));
      onChange(fallback);
    } else if (max !== undefined && parsed > max) {
      setLocalText(String(max));
      onChange(max);
    } else {
      setLocalText(String(parsed));
      onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localText}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/wood-cut/__tests__/NumericInput.test.tsx`
Expected: PASS (4 tests passed)

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/wood-cut/NumericInput.tsx src/components/wood-cut/__tests__/NumericInput.test.tsx
git commit -m "feat(wood-cut): add NumericInput component with TDD test suite"
```

---

### Task 2: Update Optimizer & Decomposer for Rotation Assumption & Input Sanitization

**Files:**
- Modify: `src/lib/woodCuttingOptimizer.ts`
- Modify: `src/lib/woodDecomposer.ts`
- Modify: `src/lib/woodCutParser.ts`
- Test: `src/lib/__tests__/woodCuttingOptimizer.test.ts`
- Test: `src/lib/__tests__/woodDecomposer.test.ts`

**Interfaces:**
- `calculateWoodCut(stockSheets: StockSheetInput[], requiredPieces: RequiredPieceInput[], customConfig?: Partial<CalculationConfig>): CalculationResult`
- `decomposeOversizedPieces(pieces: RequiredPieceInput[], stockSheets: StockSheetInput[], config: CalculationConfig)`

- [ ] **Step 1: Write the failing tests**

Add test case in `src/lib/__tests__/woodCuttingOptimizer.test.ts` for automatic 90° rotation placement & handling empty/zero dimensions gracefully:
```tsx
  it("automatically rotates pieces 90 degrees to fit stock sheet without error", () => {
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1200, width: 600 }
    ];
    // A piece 500x800 cannot fit normal (800 > 600) but fits rotated (800 <= 1200 and 500 <= 600)
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm ngang", length: 500, width: 800, quantity: 1, allowRotation: true }
    ];
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces[0].rotated).toBe(true);
  });

  it("filters out invalid zero or negative dimensions safely without throwing", () => {
    const stockSheets: StockSheetInput[] = [
      { id: "s1", length: 1200, width: 600 }
    ];
    const pieces: RequiredPieceInput[] = [
      { id: "p-invalid", name: "Tấm dở dang", length: 0, width: 0, quantity: 1, allowRotation: true },
      { id: "p-valid", name: "Tấm hợp lệ", length: 300, width: 300, quantity: 1, allowRotation: true },
    ];
    const result = calculateWoodCut(stockSheets, pieces, { kerf: 3 });
    expect(result.stockSheetsUsed).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces).toHaveLength(1);
    expect(result.stockSheetsUsed[0].placedPieces[0].name).toBe("Tấm hợp lệ");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts`

- [ ] **Step 3: Implement input sanitization and rotation enforcement in `woodCuttingOptimizer.ts` and `woodDecomposer.ts`**

Update `src/lib/woodCuttingOptimizer.ts`:
- Sanitize `stockSheets` and `requiredPieces`:
  ```ts
  const validStock = stockSheets.filter(s => s.length > 0 && s.width > 0);
  const validPieces = requiredPieces.filter(p => p.length > 0 && p.width > 0 && p.quantity > 0).map(p => ({ ...p, allowRotation: true }));
  ```
- If either array is empty, return empty `CalculationResult`.

Update `src/lib/woodDecomposer.ts`:
- Ensure `allowRotation` defaults to `true`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/woodCuttingOptimizer.test.ts src/lib/__tests__/woodDecomposer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/woodCuttingOptimizer.ts src/lib/woodDecomposer.ts src/lib/woodCutParser.ts src/lib/__tests__/woodCuttingOptimizer.test.ts
git commit -m "fix(wood-cut): enforce rotation assumption and sanitize input dimensions in optimizer"
```

---

### Task 3: Integrate `NumericInput` and Remove Rotation Checkbox in UI

**Files:**
- Modify: `src/components/wood-cut/RequiredPiecesForm.tsx`
- Modify: `src/components/wood-cut/StockSheetForm.tsx`

**Interfaces:**
- `RequiredPiecesForm({ pieces, setPieces, onCalculate }: Props)`
- `StockSheetForm({ stockSheets, setStockSheets, config, setConfig }: Props)`

- [ ] **Step 1: Update `RequiredPiecesForm.tsx`**
  - Import `NumericInput` from `./NumericInput`.
  - Remove checkbox `<input type="checkbox" ... /> Xoay`.
  - Replace length input:
    ```tsx
    <NumericInput
      value={p.length}
      onChange={(val) => handleUpdate(p.id, "length", val)}
      min={1}
      defaultValue={100}
      className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
      placeholder="Dài"
      ariaLabel={`Chiều dài ${p.name}`}
    />
    ```
  - Replace width input:
    ```tsx
    <NumericInput
      value={p.width}
      onChange={(val) => handleUpdate(p.id, "width", val)}
      min={1}
      defaultValue={100}
      className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
      placeholder="Rộng"
      ariaLabel={`Chiều rộng ${p.name}`}
    />
    ```
  - Replace quantity input:
    ```tsx
    <NumericInput
      value={p.quantity}
      onChange={(val) => handleUpdate(p.id, "quantity", val)}
      min={1}
      defaultValue={1}
      className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
      ariaLabel={`Số lượng ${p.name}`}
    />
    ```

- [ ] **Step 2: Update `StockSheetForm.tsx`**
  - Import `NumericInput` from `./NumericInput`.
  - Replace Kerf input:
    ```tsx
    <NumericInput
      value={config.kerf}
      onChange={(val) => setConfig({ ...config, kerf: val })}
      min={0}
      max={20}
      defaultValue={3}
      className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
      ariaLabel="Độ dày lưỡi cưa"
    />
    ```
  - Replace stock sheet length & width inputs:
    ```tsx
    <NumericInput
      value={s.length}
      onChange={(val) => handleUpdate(s.id, "length", val)}
      min={1}
      defaultValue={1200}
      className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
      placeholder="Dài"
      ariaLabel={`Chiều dài ${s.name || "ván gốc"}`}
    />
    <NumericInput
      value={s.width}
      onChange={(val) => handleUpdate(s.id, "width", val)}
      min={1}
      defaultValue={600}
      className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
      placeholder="Rộng"
      ariaLabel={`Chiều rộng ${s.name || "ván gốc"}`}
    />
    ```

- [ ] **Step 3: Run all unit and integration tests**

Run: `npm test`
Expected: PASS (All test suites pass)

- [ ] **Step 4: Commit Task 3**

```bash
git add src/components/wood-cut/RequiredPiecesForm.tsx src/components/wood-cut/StockSheetForm.tsx
git commit -m "feat(wood-cut): integrate NumericInput and remove rotation checkbox in forms"
```

---

### Task 4: Complete Verification & Smoke Test

**Files:**
- Test all components and optimizer end-to-end.

- [ ] **Step 1: Run full test suite**
Run: `npm test`
Expected: 100% pass across all test files.

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run build verification**
Run: `npm run build`
Expected: Build succeeds without TypeScript or bundling errors.

- [ ] **Step 4: Final commit**
```bash
git commit --allow-empty -m "chore(wood-cut): complete rotation assumption and input improvements"
```
