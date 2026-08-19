# Design Spec: Wood-Cut Page Rotation Assumption & Numeric Input Improvements

## Overview
This specification details UI and algorithmic improvements for the `/wood-cut` (Tối Ưu Cắt & Ghép Ván Gỗ) page:
1. **Always-Allow-Rotation**: Remove the individual "Xoay" (allowRotation) checkboxes from the UI and establish a system-wide assumption that all wood pieces can be rotated 90° for optimal cutting and nesting.
2. **Smooth Numeric Inputs**: Fix the issue where deleting digits in dimension inputs snaps back to `"1"`, replacing raw `<input type="number">` with a robust `<NumericInput />` component that allows natural editing and empty states while active.

---

## 1. Background & Problems Identified

### Problem 1: Manual Rotation Toggle & Algorithm Fallbacks
- Previously, each required piece had an `allowRotation` checkbox. When unticked, the piece was constrained to a fixed orientation.
- In scenarios where a piece's width exceeded the stock sheet's width but fit along the stock sheet's length (or during decomposition of oversized panels), disabling rotation could cause the packing/decomposition algorithm to fail to place or decompose the piece.
- In woodcutting optimization (especially sheet cutting without strict grain orientation constraints), rotating 90° is universally desired to maximize sheet yield.

### Problem 2: Input Field Number "1" Trapping
- Input fields in `RequiredPiecesForm.tsx` and `StockSheetForm.tsx` used:
  ```tsx
  onChange={(e) => handleUpdate(..., Math.max(1, parseInt(e.target.value) || 0))}
  ```
- When a user selects and deletes the text, `e.target.value` becomes `""`, `parseInt("")` results in `NaN`, defaulting to `0`, and `Math.max(1, 0)` immediately resets the state to `1`.
- To type a number like `2233`, users had to awkwardly type `12233` and then delete the leading `1`.

---

## 2. Architecture & Design

### 2.1 Reusable `NumericInput` Component
A new component `src/components/wood-cut/NumericInput.tsx`:

```tsx
interface NumericInputProps {
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
```

#### Behavior & State Flow:
1. **Local Buffering**: Holds an internal `localText: string` initialized from `props.value`.
2. **Sync on External Change**: When `props.value` changes externally (e.g. initial load, batch paste, presets), updates `localText`.
3. **Handling `onChange`**:
   - Updates `localText` immediately with `e.target.value`.
   - If empty (`""`), does not fire `onChange` with a dummy value, keeping the input clean.
   - If a valid number is parsed (and $\ge$ `min`), calls `onChange(parsedVal)`.
4. **Handling `onBlur`**:
   - If `localText` is empty or parsed value $< \text{min}$: reverts `localText` to `defaultValue ?? min ?? 1` and calls `onChange`.
   - If valid: formats and ensures clean numeric string.

### 2.2 UI Updates
- **`RequiredPiecesForm.tsx`**:
  - Remove the "Xoay" checkbox column from each row.
  - Replace length, width, and quantity inputs with `<NumericInput />`:
    - Length: `min={1}`, `defaultValue={100}`
    - Width: `min={1}`, `defaultValue={100}`
    - Quantity: `min={1}`, `defaultValue={1}`
  - Keep `allowRotation: true` on all created / parsed piece objects.
- **`StockSheetForm.tsx`**:
  - Replace length and width inputs with `<NumericInput />` (`min={1}`, `defaultValue={1200}` / `600`).
  - Replace Kerf input with `<NumericInput />` (`min={0}`, `max={20}`, `defaultValue={3}`).

### 2.3 Algorithm & Data Safety
- **`woodDecomposer.ts`**:
  - Ensure all decomposition algorithms consider 90° rotation as default behavior (`allowRotation` defaults to `true`).
- **`woodCuttingOptimizer.ts`**:
  - Sanitize input list: filter out invalid entries (`length <= 0`, `width <= 0`, `quantity <= 0`) before running packing heuristics, preventing intermediate typing states from triggering computational errors.
  - Maintain `allowRotation = true` for all packing placements.
- **`woodCutParser.ts`**:
  - Ensure all batch-parsed items set `allowRotation: true`.

---

## 3. Error Handling & Edge Cases

| Scenario | Expected Handling |
| :--- | :--- |
| User deletes input to empty `""` and keeps typing `2233` | Input remains empty while typing, then shows `2233` and updates calculation state cleanly. |
| User deletes input to empty `""` and clicks away (`onBlur`) | Input resets to `defaultValue` (e.g. `100` for dimensions, `1` for quantity) and triggers calculation. |
| User enters negative numbers or non-numeric characters | Controlled input ignores invalid characters / enforces minimum bounds. |
| Piece length > sheet length, but piece length <= sheet width | Automatically rotated 90° to fit into the stock sheet. |

---

## 4. Verification & Testing

1. **Unit Tests**:
   - `NumericInput.test.tsx`: Test typing, clearing to empty, multi-digit entry, and onBlur fallback.
   - `woodCuttingOptimizer.test.ts`: Verify that pieces requiring 90° rotation are placed successfully without user needing to toggle rotation.
   - `woodDecomposer.test.ts`: Verify decomposition always utilizes 90° rotation opportunities.
2. **Integration Verification**:
   - Verify that all existing unit and integration tests pass (`npm test`).
   - Manual smoke test on `/wood-cut` page for input responsiveness.
