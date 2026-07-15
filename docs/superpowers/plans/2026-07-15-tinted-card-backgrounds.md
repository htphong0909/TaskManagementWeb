# Tinted Card Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Style active (in progress) and completed cards with solid, subtly tinted background colors (white-greenish and white-orangish) instead of relying on semi-transparent backgrounds over the page gradient.

**Architecture:** Conditionalize the background classes on the card wrapper in `BoardCard.tsx` so that `bg-white` is replaced with solid tinted background colors and custom hover states depending on the card's `is_completed` and `is_in_progress` flags. Update tests to verify these classes.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4.

## Global Constraints
- Do not let the board's gradient background bleed through the cards (use solid pastel-white backgrounds).
- Keep the tint very subtle, mostly white, as requested.
- Ensure all tests pass.

---

### Task 1: Conditionalize Card Wrapper Background Colors

**Files:**
- Modify: [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx)

**Interfaces:**
- Consumes: `card.is_completed` and `card.is_in_progress` fields from card object.
- Produces: Subtle tinted backgrounds on the card elements:
  - Completed: `bg-[#f4fdf8]` (tinted green) and `hover:bg-[#ecfaf1]` (tinted green on hover)
  - In Progress: `bg-[#fffcf5]` (tinted orange) and `hover:bg-[#fff5e6]` (tinted orange on hover)
  - Normal: `bg-white` and standard hover classes.

- [ ] **Step 1: Modify className generation in BoardCard.tsx**
  Replace the hardcoded `bg-white` at the start of the `className` template string of the wrapper card `div` in `BoardCard.tsx` (around lines 142-152) and replace `bg-emerald-50/20` and `bg-orange-50/20` with solid backgrounds.
  
  Code change to apply:
  ```diff
  -      className={`group/card bg-white border rounded-xl p-4 flex flex-col gap-2 relative cursor-pointer active:cursor-grabbing
  +      className={`group/card border rounded-xl p-4 flex flex-col gap-2 relative cursor-pointer active:cursor-grabbing
          ${isDragging 
            ? "opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]" 
            : card.is_completed
  -            ? "border-emerald-500/30 bg-emerald-50/20 shadow-[0_2px_8px_rgba(16,185,129,0.02)] hover:border-emerald-500/50 hover:bg-emerald-50/30 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:-translate-y-0.5 transition-all duration-150"
  +            ? "border-emerald-500/30 bg-[#f4fdf8] shadow-[0_2px_8px_rgba(16,185,129,0.02)] hover:border-emerald-500/50 hover:bg-[#ecfaf1] hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:-translate-y-0.5 transition-all duration-150"
              : card.is_in_progress
  -              ? "border-orange-500/30 bg-orange-50/20 shadow-[0_2px_8px_rgba(249,115,22,0.02)] hover:border-orange-500/50 hover:bg-orange-50/30 hover:shadow-[0_8px_20px_rgba(249,115,22,0.06)] hover:-translate-y-0.5 transition-all duration-150"
  -              : "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 transition-all duration-150"
  +              ? "border-orange-500/30 bg-[#fffcf5] shadow-[0_2px_8px_rgba(249,115,22,0.02)] hover:border-orange-500/50 hover:bg-[#fff5e6] hover:shadow-[0_8px_20px_rgba(249,115,22,0.06)] hover:-translate-y-0.5 transition-all duration-150"
  +              : "bg-white border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 transition-all duration-150"
          }
  ```

---

### Task 2: Update Unit Tests

**Files:**
- Modify: [BoardCard.test.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/__tests__/BoardCard.test.tsx)

**Interfaces:**
- Consumes: `BoardCard` component.
- Produces: Additional unit tests asserting background color classes are correctly applied.

- [ ] **Step 1: Add background color assertions to BoardCard.test.tsx**
  Add two test cases in `src/__tests__/BoardCard.test.tsx`:
  - Renders completed card with solid greenish-white background classes.
  - Renders in-progress card with solid orangish-white background classes.

- [ ] **Step 2: Run and verify tests**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 3: Run linter**
  Run: `npm run lint`
  Expected: No linting errors.
