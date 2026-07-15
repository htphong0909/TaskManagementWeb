# Board Display Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the display of boards in the application: format board dates to `MM/YYYY` in the switcher sidebar, and render completed and in-progress card counts next to board titles in both the switcher and the main header.

**Architecture:** Fetch all user cards client-side in `BoardSwitcher.tsx` and group them by board in state to render counters next to each board item. In `src/app/board/[id]/page.tsx`, compute status counters directly from the loaded `cards` state and render next to the page title on the same line. Format date display in the switcher using manual month/year string generation.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS v4, Supabase JS Client.

## Global Constraints
- Do not affect date editing logic on the main page (main page can still keep its format/editing functions).
- Counts must follow the format `<number> <icon>` where checkmark/emerald-600 represents completed cards, and clock/orange-600 represents in-progress cards.
- Clean compilation and all tests must pass.

---

### Task 1: Update Board Switcher Components

**Files:**
- Modify: [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx)

**Interfaces:**
- Consumes: Card data from Supabase.
- Produces: `boardCardCounts` state, custom formatted date strings (`MM/YYYY`), and count indicators inside `renderBoardItem(b)`.

- [ ] **Step 1: Declare boardCardCounts state & update fetchFoldersAndBoards**
  In `src/components/BoardSwitcher.tsx` (around lines 50-60), add the state:
  ```typescript
  const [boardCardCounts, setBoardCardCounts] = useState<Record<string, { completed: number; inProgress: number }>>({});
  ```
  And update `fetchFoldersAndBoards` (around lines 63-77) to query card status counts:
  ```typescript
    const fetchFoldersAndBoards = useCallback(async () => {
      // 1. Fetch folders
      const { data: folderData } = await supabase
        .from("folders")
        .select("id, title, position")
        .order("position", { ascending: true });
      setFolders(folderData || []);

      // 2. Fetch boards
      const { data: boardData } = await supabase
        .from("boards")
        .select("id, title, position, folder_id, board_date")
        .order("position", { ascending: true });
      setBoards(boardData || []);

      // 3. Fetch card counts per board
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("is_completed, is_in_progress, lists!inner(board_id)");

      if (!cardsError && cardsData) {
        const counts: Record<string, { completed: number; inProgress: number }> = {};
        cardsData.forEach((c: any) => {
          const boardId = c.lists?.board_id;
          if (boardId) {
            if (!counts[boardId]) {
              counts[boardId] = { completed: 0, inProgress: 0 };
            }
            if (c.is_completed) {
              counts[boardId].completed++;
            } else if (c.is_in_progress) {
              counts[boardId].inProgress++;
            }
          }
        });
        setBoardCardCounts(counts);
      } else {
        setBoardCardCounts({});
      }
    }, [supabase]);
  ```

- [ ] **Step 2: Update date formatting to Month/Year in renderBoardItem**
  Modify the date rendering in `renderBoardItem` (around lines 494-504) in `src/components/BoardSwitcher.tsx`:
  ```tsx
            {b.board_date && (() => {
              const d = new Date(b.board_date);
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const yyyy = d.getFullYear();
              return (
                <span className="text-[9px] text-slate-400 font-normal select-none -mt-1 mb-0.5 text-left">
                  {mm}/{yyyy}
                </span>
              );
            })()}
  ```

- [ ] **Step 3: Render card counts next to board title in renderBoardItem**
  Modify the board title display inside `renderBoardItem` (around lines 524-529) in `src/components/BoardSwitcher.tsx`:
  ```tsx
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
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="line-clamp-2 break-words text-left" title={b.title}>
                    {b.title}
                  </span>
                  {(() => {
                    const counts = boardCardCounts[b.id] || { completed: 0, inProgress: 0 };
                    return (
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 select-none">
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold" title="Đã hoàn thành">
                          {counts.completed}
                          <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-600 font-bold" title="Đang thực hiện">
                          {counts.inProgress}
                          <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
  ```

---

### Task 2: Update Main Board Header in Board Page

**Files:**
- Modify: [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/[id]/page.tsx)

**Interfaces:**
- Consumes: `cards` state.
- Produces: JSX header status counters.

- [ ] **Step 1: Compute counts and render adjacent to boardTitle**
  In `src/app/board/[id]/page.tsx`, compute counts and modify line 709 to render inline status counts:
  ```tsx
              <div className="flex items-baseline gap-3">
                <h2 className="text-base font-bold text-slate-800 select-none mt-1 leading-none">{boardTitle || "Bảng công việc"}</h2>
                {(() => {
                  const completedCount = cards.filter((c) => c.is_completed).length;
                  const inProgressCount = cards.filter((c) => c.is_in_progress).length;
                  return (
                    <div className="flex items-center gap-2 select-none">
                      <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600" title="Đã hoàn thành">
                        {completedCount}
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="flex items-center gap-0.5 text-xs font-bold text-orange-600" title="Đang thực hiện">
                        {inProgressCount}
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                  );
                })()}
              </div>
  ```

---

### Task 3: Unit Testing & Linter Verification

**Files:**
- Create: [BoardSwitcher.test.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/__tests__/BoardSwitcher.test.tsx)

- [ ] **Step 1: Create BoardSwitcher unit tests**
  Create `src/__tests__/BoardSwitcher.test.tsx` containing tests that mock Supabase client data, render `BoardSwitcher`, and verify:
  - Board date formatted to `MM/YYYY` is rendered.
  - Card counts are computed and rendered with custom checkmark / clock icon styles.

- [ ] **Step 2: Run test suite**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 3: Run linter**
  Run: `npm run lint`
  Expected: Successfully completes with 0 errors.
