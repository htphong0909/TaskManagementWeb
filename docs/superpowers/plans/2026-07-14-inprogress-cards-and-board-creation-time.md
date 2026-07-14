# In-Progress Cards and Board Creation Date Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an "ĐANG DIỄN RA" (In Progress) checkbox state in cards, with orange styling, and display the board creation date on switcher items and the main workspace header.

**Architecture:** Create a Supabase migration to add `is_in_progress` to the cards table with a CHECK constraint. In the UI, add an "Đang thực hiện công việc" checkbox to the Card Details Modal, maintaining mutual exclusivity with "Đã hoàn thành công việc". Set card background styling to orange when the card is in progress. Fetch and display `created_at` for boards.

**Tech Stack:** Next.js, React, Supabase, TailwindCSS (for CSS styling).

## Global Constraints
- Do not check both "ĐANG DIỄN RA" and "ĐÃ HOÀN THÀNH" at the same time.
- Display board creation time next to board names in switcher list items, and next to Workspace subtitle in the header.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260714202500_add_is_in_progress_to_cards.sql`

**Interfaces:**
- Produces: `is_in_progress` column (BOOLEAN) on `cards` table, with constraint `cards_status_exclusive_check` checking `NOT (is_completed AND is_in_progress)`

- [ ] **Step 1: Write migration query**
  Create `supabase/migrations/20260714202500_add_is_in_progress_to_cards.sql` containing:
  ```sql
  -- Add is_in_progress column and check constraint
  ALTER TABLE public.cards ADD COLUMN is_in_progress BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.cards ADD CONSTRAINT cards_status_exclusive_check CHECK (NOT (is_completed AND is_in_progress));
  ```

- [ ] **Step 2: Commit database migration**
  Run: `git add supabase/migrations/20260714202500_add_is_in_progress_to_cards.sql`
  Run: `git commit -m "migration: add is_in_progress column to cards table"`

---

### Task 2: Refactor `page.tsx`

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

**Interfaces:**
- Consumes: `is_in_progress` from `cards` table, `created_at` from `boards` table

- [ ] **Step 1: Update Card interface and select query in page.tsx**
  Modify `src/app/board/[id]/page.tsx`.
  - Add `is_in_progress?: boolean;` to `Card` interface (around line 26).
  - Add state `boardCreatedAt`:
    ```typescript
    const [boardCreatedAt, setBoardCreatedAt] = useState("");
    ```
    Insert it directly under `const [boardTitle, setBoardTitle] = useState("");` (around line 32).
  - Update board query select block (around line 118) to:
    ```typescript
            .select("title, created_at")
    ```
  - Update setting state block inside `fetchBoardData` (around line 121):
    ```typescript
          if (boardData) {
            setBoardTitle(boardData.title);
            setBoardCreatedAt(boardData.created_at || "");
          }
    ```
  - Update card select query block (around line 138) to select `is_in_progress`:
    ```typescript
              .select("id, list_id, title, content, position, due_date, created_at, is_completed, is_in_progress")
    ```

- [ ] **Step 2: Add board creation date to header rendering**
  In `src/app/board/[id]/page.tsx`, replace lines 636-639 with:
  ```typescript
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[10px] font-bold tracking-wider text-violet-700 uppercase leading-none">Workspace</h1>
                {boardCreatedAt && (
                  <span className="text-[9px] text-slate-400 font-normal select-none leading-none">
                    (Tạo lúc: {new Date(boardCreatedAt).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })})
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-800 select-none mt-1 leading-none">{boardTitle || "Bảng công việc"}</h2>
            </div>
  ```

- [ ] **Step 3: Verify and Commit**
  Run: `git add src/app/board/[id]/page.tsx`
  Run: `git commit -m "feat: fetch and display board creation time in workspace header"`

---

### Task 3: Refactor BoardSwitcher and Column / Card Components

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`
- Modify: `src/components/BoardColumn.tsx`
- Modify: `src/components/BoardCard.tsx`

**Interfaces:**
- Consumes: `created_at` from `Board` interface, `is_in_progress` from `Card` interface

- [ ] **Step 1: Update BoardSwitcher.tsx**
  Modify `src/components/BoardSwitcher.tsx`:
  - Add `created_at?: string;` to `Board` interface (around line 17).
  - Update supabase select query in `fetchFoldersAndBoards` (around line 73) to:
    ```typescript
          .select("id, title, position, folder_id, created_at")
    ```
  - Update `renderBoardItem` container (around lines 478-501) to show the creation date:
    Replace lines 478-502 with:
    ```typescript
          <div className="flex flex-col flex-1 min-w-0">
            {b.created_at && (
              <span className="text-[9px] text-slate-400 font-normal select-none -mt-1 mb-0.5 text-left">
                {new Date(b.created_at).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <div className="flex items-start gap-2 overflow-hidden flex-1 pt-0.5">
              {/* Board icon */}
              <svg className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-violet-500 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRenameSubmit(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(b.id);
                    if (e.key === "Escape") setEditingBoardId(null);
                  }}
                  className="bg-transparent border-b border-violet-500 outline-none text-violet-600 font-bold px-0.5 w-full text-xs"
                  autoFocus
                />
              ) : (
                <span className="line-clamp-2 break-words flex-1 text-left" title={b.title}>
                  {b.title}
                </span>
              )}
            </div>
          </div>
    ```

- [ ] **Step 2: Update BoardColumn.tsx**
  Modify `src/components/BoardColumn.tsx` to add `is_in_progress?: boolean;` to `Card` interface (around line 19).

- [ ] **Step 3: Update BoardCard.tsx**
  Modify `src/components/BoardCard.tsx`:
  - Add `is_in_progress?: boolean;` to `Card` interface (around line 11).
  - Update card container styling block (around line 144-147) to style in progress card orange:
    Replace lines 144-147 with:
    ```typescript
              : card.is_completed
                ? "border-emerald-500/30 bg-emerald-50/20 shadow-[0_2px_8px_rgba(16,185,129,0.02)] hover:border-emerald-500/50 hover:bg-emerald-50/30 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:-translate-y-0.5 transition-all duration-150"
                : card.is_in_progress
                  ? "border-orange-500/30 bg-orange-50/20 shadow-[0_2px_8px_rgba(249,115,22,0.02)] hover:border-orange-500/50 hover:bg-orange-50/30 hover:shadow-[0_8px_20px_rgba(249,115,22,0.06)] hover:-translate-y-0.5 transition-all duration-150"
                  : "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 transition-all duration-150"
    ```
  - Add badge rendering inside creation date layout block (around line 174-178):
    Replace lines 174-178 with:
    ```typescript
                {card.is_completed && (
                  <span className="text-[8px] text-emerald-600/60 font-semibold bg-emerald-50/30 border border-emerald-100/30 px-1.5 py-0.5 rounded-full tracking-wider">
                    ĐÃ HOÀN THÀNH
                  </span>
                )}
                {card.is_in_progress && (
                  <span className="text-[8px] text-orange-600/60 font-semibold bg-orange-50/30 border border-orange-100/30 px-1.5 py-0.5 rounded-full tracking-wider">
                    ĐANG DIỄN RA
                  </span>
                )}
    ```

- [ ] **Step 4: Commit components changes**
  Run: `git add src/components/BoardSwitcher.tsx src/components/BoardColumn.tsx src/components/BoardCard.tsx`
  Run: `git commit -m "feat: update board switcher timestamp and style in-progress cards orange"`

---

### Task 4: Refactor `CardDetailModal.tsx`

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Interfaces:**
- Consumes: `is_in_progress` state for cards

- [ ] **Step 1: Update Card interface and state hooks in CardDetailModal.tsx**
  Modify `src/components/CardDetailModal.tsx`:
  - Add `is_in_progress?: boolean;` to `Card` interface (around line 28).
  - Add state `isInProgress`:
    ```typescript
    const [isInProgress, setIsInProgress] = useState(false);
    ```
    Insert it directly under `const [isCompleted, setIsCompleted] = useState(false);` (around line 160).
  - Set it inside `fetchCardData` (around line 311):
    ```typescript
          setIsInProgress(data.is_in_progress || false);
    ```

- [ ] **Step 2: Add progress checkbox and toggle logic**
  In `src/components/CardDetailModal.tsx`:
  - Add checkbox update logic `handleToggleInProgressInModal` and update `handleToggleCompletedInModal`:
    Replace lines 447-450 with:
    ```typescript
      const handleToggleCompletedInModal = async (completed: boolean) => {
        setIsCompleted(completed);
        if (completed) {
          setIsInProgress(false);
          try {
            const { error } = await supabase
              .from("cards")
              .update({ is_completed: true, is_in_progress: false })
              .eq("id", cardId);
            if (error) throw error;
            onCardUpdated();
          } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
          }
        } else {
          await saveField("is_completed", false);
        }
      };

      const handleToggleInProgressInModal = async (inProgress: boolean) => {
        setIsInProgress(inProgress);
        if (inProgress) {
          setIsCompleted(false);
          try {
            const { error } = await supabase
              .from("cards")
              .update({ is_in_progress: true, is_completed: false })
              .eq("id", cardId);
            if (error) throw error;
            onCardUpdated();
          } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
          }
        } else {
          await saveField("is_in_progress", false);
        }
      };
    ```
  - Add the new progress checkbox in right sidebar UI block (around lines 1380-1391):
    Replace lines 1380-1391 with:
    ```typescript
                    {/* Checkbox Trạng thái Hoàn thành */}
                    <div className="flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        id="completed-modal-checkbox"
                        checked={isCompleted}
                        onChange={(e) => handleToggleCompletedInModal(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <label htmlFor="completed-modal-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Đã hoàn thành công việc
                      </label>
                    </div>

                    {/* Checkbox Trạng thái Đang diễn ra */}
                    <div className="flex items-center gap-2 select-none mt-1">
                      <input
                        type="checkbox"
                        id="inprogress-modal-checkbox"
                        checked={isInProgress}
                        onChange={(e) => handleToggleInProgressInModal(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="inprogress-modal-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Đang thực hiện công việc
                      </label>
                    </div>
    ```

- [ ] **Step 3: Verify and Commit**
  Run: `npm run build`
  Run: `git add src/components/CardDetailModal.tsx`
  Run: `git commit -m "feat: add is_in_progress checkbox in CardDetailModal and implement mutual exclusivity"`
