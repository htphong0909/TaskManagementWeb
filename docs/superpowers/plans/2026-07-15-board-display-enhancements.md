# Board Display Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the display of boards in the application: format board dates to `MM/YYYY` in the switcher sidebar, and render completed and in-progress card counts next to board titles in both the switcher and the main header only if they are greater than 0.

**Architecture:** Fetch all user cards client-side in `BoardSwitcher.tsx` and group them by board in state to render counters next to each board item. In `src/app/board/[id]/page.tsx`, compute status counters directly from the loaded `cards` state and render next to the page title on the same line. Formats and filters counts to only render if `count > 0`.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS v4, Supabase JS Client.

## Global Constraints
- Hide count numbers and icons if their value is 0.
- Counts must follow the format `<number> <icon>` where checkmark/emerald-600 represents completed cards, and clock/orange-600 represents in-progress cards.
- Clean compilation and all tests must pass.

---

### Task 1: Update Board Switcher Component for Conditional Counters

**Files:**
- Modify: [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx)

**Interfaces:**
- Consumes: Card data from Supabase.
- Produces: JSX with conditionally rendered completed (`counts.completed > 0`) and in-progress (`counts.inProgress > 0`) status count nodes.

- [ ] **Step 1: Apply conditional count rendering logic inside renderBoardItem**
  Modify [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx) (around lines 547-578) to hide counters when counts are 0:
  ```tsx
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="line-clamp-2 break-words text-left" title={b.title}>
                  {b.title}
                </span>
                {(() => {
                  const counts = boardCardCounts[b.id] || { completed: 0, inProgress: 0 };
                  if (counts.completed === 0 && counts.inProgress === 0) return null;
                  return (
                    <div className="flex items-center gap-1.5 shrink-0 ml-2 select-none">
                      {counts.completed > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold" title="Đã hoàn thành">
                          {counts.completed}
                          <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      {counts.inProgress > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-600 font-bold" title="Đang thực hiện">
                          {counts.inProgress}
                          <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
  ```

---

### Task 2: Update Main Board Header in Board Page

**Files:**
- Modify: [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/[id]/page.tsx)

**Interfaces:**
- Consumes: `cards` state.
- Produces: JSX with conditionally rendered completed (`completedCount > 0`) and in-progress (`inProgressCount > 0`) status count nodes next to boardTitle.

- [ ] **Step 1: Add conditional check to main header counts**
  Modify [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/[id]/page.tsx) (around lines 709-731):
  ```tsx
            <div className="flex items-baseline gap-3">
              <h2 className="text-base font-bold text-slate-800 select-none mt-1 leading-none">{boardTitle || "Bảng công việc"}</h2>
              {(() => {
                const completedCount = cards.filter((c) => c.is_completed).length;
                const inProgressCount = cards.filter((c) => c.is_in_progress).length;
                if (completedCount === 0 && inProgressCount === 0) return null;
                return (
                  <div className="flex items-center gap-2 select-none mt-1">
                    {completedCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600" title="Đã hoàn thành">
                        {completedCount}
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {inProgressCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-orange-600" title="Đang thực hiện">
                        {inProgressCount}
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
  ```

---

### Task 3: Unit Testing & Linter Verification

**Files:**
- Modify: [BoardSwitcher.test.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/__tests__/BoardSwitcher.test.tsx)

- [ ] **Step 1: Update BoardSwitcher unit tests**
  Modify `src/__tests__/BoardSwitcher.test.tsx` to assert:
  - When `completed` or `in_progress` counts are 0, they are not rendered in the DOM.
  - Check counts with mixed values (e.g. `0` completed, `1` in progress) correctly hides the zero count.

- [ ] **Step 2: Run test suite**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 3: Run linter**
  Run: `npm run lint`
  Expected: Successfully completes with 0 errors.
