# Wood Cut: Exact DP Mode & 3-Way Piece Orientation Design

**Date**: 2026-08-24  
**Status**: Approved  
**Topic**: Adding exact Dynamic Programming (DP) algorithm mode and 3-way piece orientation options (Vertical, Horizontal, Auto) to Wood Cutting Calculator.

---

## 1. Overview

Currently, the Wood Cutting Calculator (`/wood-cut`) uses a multi-heuristic ensemble solver for 2D Guillotine cutting and supports a binary rotation flag (`allowRotation: boolean`).
This feature expands the calculator with:
1. **3-Way Piece Orientation Selection** (`orientation: "auto" | "vertical" | "horizontal"`):
   - **Auto (`auto`)**: The algorithm freely decides $0^\circ$ or $90^\circ$ orientation to optimize board usage.
   - **Vertical (`vertical`)**: Keeps length $L$ along the stock sheet length $L_{\text{stock}}$ (grain direction preserved, no rotation).
   - **Horizontal (`horizontal`)**: Forces $90^\circ$ rotation ($W \times L$ placed along stock sheet).
2. **Fast Batch Parser Support**: Extended tag parsing supporting `!doc` / `!v` / `!d`, `!ngang` / `!h` / `!n`, and `!xoay` / `!auto`.
3. **Exact DP Solver Toggle** (`useExactDP: boolean`): Option in the UI to switch between the Real-time Multi-Heuristic Ensemble and Exact Dynamic Programming (Ground Truth DP) solver.

---

## 2. Architecture & Data Model Changes

### 2.1 Types (`src/types/woodCut.ts`)

```typescript
export type PieceOrientation = "auto" | "vertical" | "horizontal";

export interface RequiredPieceInput {
  id: string;
  name: string;
  length: number;
  width: number;
  quantity: number;
  orientation: PieceOrientation;
  allowRotation?: boolean; // Maintained for backward-compatibility
}

export interface CalculationConfig {
  kerf: number;            // Default 3mm
  minSubPieceSize: number; // Default 50mm
  useExactDP?: boolean;    // Default false (toggleable in UI)
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

---

## 3. Component & Module Breakdown

### 3.1 Batch Parser (`src/lib/woodCutParser.ts`)
* **Parsing orientation tags**:
  - `vertical`: `!doc`, `!d`, `!v`, `!r`, `norot`, `no-rot`, `lock`, `r=0`, `rot=0`
  - `horizontal`: `!ngang`, `!n`, `!h`, `!horiz`, `!horizontal`
  - `auto`: `!xoay`, `!auto`, `!r=1`, `!rot=1` (or omitted by default)
* **Formatting to text (`formatPiecesToText`)**:
  - Outputs `!doc` when `orientation === "vertical"`
  - Outputs `!ngang` when `orientation === "horizontal"`
  - Omitted when `orientation === "auto"`

### 3.2 Wood Decomposer (`src/lib/woodDecomposer.ts`)
* Oversized pieces larger than stock sheet dimensions:
  - If `orientation === "vertical"`: candidate initial dimension is strictly $(L, W)$.
  - If `orientation === "horizontal"`: candidate initial dimension is strictly $(W, L)$.
  - If `orientation === "auto"`: candidate initial dimensions are both $(L, W)$ and $(W, L)$.
* Generated sub-pieces inherit the parent orientation constraints.

### 3.3 Optimizers (`src/lib/woodCuttingOptimizer.ts` & `src/lib/cp/dpGroundTruthOptimizer.ts`)
* During rectangle packing / Guillotine placement:
  - `orientation === "vertical"`: only place as $(L, W)$, rotated = false.
  - `orientation === "horizontal"`: only place as $(W, L)$, rotated = true.
  - `orientation === "auto"`: test both $(L, W)$ and $(W, L)$ (if $L \ne W$).

### 3.4 UI Components

#### `src/components/wood-cut/RequiredPiecesForm.tsx`
* For each piece row in table mode:
  - Replaces checkbox with a clean `<select>` styled dropdown (Option A):
    - `🔄 Tự do xoay` (value: `"auto"`)
    - `↕️ Để dọc` (value: `"vertical"`)
    - `↔️ Để ngang` (value: `"horizontal"`)
* Batch Mode Helper text updated to explain `!doc` and `!ngang` tags.
* Bulk action: Quick toggle/set orientation for all pieces.

#### `src/components/wood-cut/StockSheetForm.tsx` / Header / Config
* Adds a switch / toggle checkbox for `🎯 Thuật toán chính xác (DP)` with a tooltip and indicator badge.

#### `src/app/wood-cut/page.tsx`
* Stores `config.useExactDP` in state & `localStorage`.
* Invokes `solveGroundTruthDP` when `config.useExactDP` is true, or `calculateWoodCut` when false.

---

## 4. Verification Plan

### Automated Unit Tests
1. `src/lib/__tests__/woodCutParser.test.ts`: Verify parsing of `!doc`, `!ngang`, `!xoay`, and formatting back to text.
2. `src/lib/__tests__/woodCuttingOptimizer.test.ts`: Verify orientation constraints (vertical, horizontal, auto) strictly obeyed during placement.
3. `src/lib/cp/__tests__/dpGroundTruthOptimizer.test.ts`: Verify DP optimizer handles vertical/horizontal constraints and produces valid exact solutions.
4. `npm run test` / `npm run build`: Verify all existing and new tests pass cleanly with zero TypeScript errors.

### Manual Verification
1. Open `/wood-cut` in browser.
2. Test table mode: select "Để dọc", "Để ngang", "Tự do xoay" and verify diagrams update accordingly.
3. Test paste mode: paste input from user image with `!doc` / `!ngang` tags and verify applied to table.
4. Toggle "Thuật toán chính xác (DP)" and verify calculations run accurately.
