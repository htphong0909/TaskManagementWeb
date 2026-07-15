# Editable Board Date Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the read-only board `created_at` timestamp with a new user-editable `board_date` column in the `boards` table, and implement inline double-click editing on the board page header.

**Architecture:** Add a new migration to introduce the `board_date` column defaulting to `created_at` values. Update `BoardSwitcher.tsx` to read the new field, and update `page.tsx` (`src/app/board/[id]/page.tsx`) to fetch, render, and allow inline editing of `board_date` via a double-click on the header timestamp, triggering database updates and refreshing sibling components via window events.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS, Supabase JS Client.

## Global Constraints
- TypeScript: Bắt buộc viết type rõ ràng cho tất cả các props, functions, state. Không lạm dụng kiểu any.
- React 19 & Next.js 16 (App Router) coding styles.
- Tailwind CSS v4 styling rules.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260715085000_add_board_date_to_boards.sql`

**Interfaces:**
- Consumes: None (raw DB alteration).
- Produces: `board_date` column on `public.boards` table.

- [ ] **Step 1: Write database migration query**
  Create `supabase/migrations/20260715085000_add_board_date_to_boards.sql` with the following content:
  ```sql
  -- 1. Thêm cột board_date kiểu TIMESTAMP WITH TIME ZONE (cho phép tạm thời NULL để copy dữ liệu)
  ALTER TABLE public.boards ADD COLUMN board_date TIMESTAMP WITH TIME ZONE;

  -- 2. Sao chép dữ liệu từ created_at sang board_date cho các board đã tồn tại
  UPDATE public.boards SET board_date = created_at WHERE board_date IS NULL;

  -- 3. Thiết lập thuộc tính NOT NULL và DEFAULT cho board_date
  ALTER TABLE public.boards ALTER COLUMN board_date SET NOT NULL;
  ALTER TABLE public.boards ALTER COLUMN board_date SET DEFAULT timezone('utc'::text, now());
  ```

- [ ] **Step 2: Commit the database migration file**
  Run:
  ```bash
  git add supabase/migrations/20260715085000_add_board_date_to_boards.sql
  git commit -m "migration: add board_date column to boards table"
  ```

---

### Task 2: Update Board Switcher Component

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`

**Interfaces:**
- Consumes: `board_date` string from Supabase query.
- Produces: Reload handler listening to custom event `reload-folders-and-boards` to sync date edits.

- [ ] **Step 1: Add board_date to Board interface**
  In `src/components/BoardSwitcher.tsx`, modify the `Board` interface (around line 12):
  ```typescript
  interface Board {
    id: string;
    title: string;
    position?: number;
    folder_id?: string | null;
    board_date?: string;
  }
  ```

- [ ] **Step 2: Update query inside fetchFoldersAndBoards**
  In `src/components/BoardSwitcher.tsx`, change `created_at` to `board_date` in the select query (around line 74):
  ```typescript
      // 2. Fetch boards
      const { data: boardData } = await supabase
        .from("boards")
        .select("id, title, position, folder_id, board_date")
        .order("position", { ascending: true });
      setBoards(boardData || []);
  ```

- [ ] **Step 3: Update board_date display**
  In `src/components/BoardSwitcher.tsx`, modify `renderBoardItem` to display `b.board_date` instead of `b.created_at` (around line 480):
  ```tsx
          <div className="flex flex-col flex-1 min-w-0">
            {b.board_date && (
              <span className="text-[9px] text-slate-400 font-normal select-none -mt-1 mb-0.5 text-left">
                {new Date(b.board_date).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <div className="flex items-start gap-2 overflow-hidden flex-1 pt-0.5">
  ```

- [ ] **Step 4: Register custom window reload listener**
  In `src/components/BoardSwitcher.tsx`, add a `useEffect` hook to reload the board list whenever `reload-folders-and-boards` is dispatched (around line 89):
  ```typescript
    useEffect(() => {
      const handleReload = () => {
        fetchFoldersAndBoards();
      };
      window.addEventListener("reload-folders-and-boards", handleReload);
      return () => {
        window.removeEventListener("reload-folders-and-boards", handleReload);
      };
    }, [fetchFoldersAndBoards]);
  ```

- [ ] **Step 5: Run tests to verify no regression**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add src/components/BoardSwitcher.tsx
  git commit -m "feat: read and display board_date in board switcher list"
  ```

---

### Task 3: Implement Board Date Editing in Board Page

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

**Interfaces:**
- Consumes: `board_date` from Supabase query.
- Produces: Double-click inline editor dispatching custom event `reload-folders-and-boards` on update.

- [ ] **Step 1: Replace boardCreatedAt state with boardDate and add edit states**
  In `src/app/board/[id]/page.tsx`, replace `boardCreatedAt` and add editing states (around line 34):
  ```typescript
    const [boardTitle, setBoardTitle] = useState("");
    const [boardDate, setBoardDate] = useState("");
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [editDateVal, setEditDateVal] = useState("");
  ```

- [ ] **Step 2: Update fetchBoardData select fields**
  In `src/app/board/[id]/page.tsx`, modify `fetchBoardData` to select `board_date` instead of `created_at` (around line 118):
  ```typescript
        // 1. Tải thông tin Board
        const { data: boardData } = await supabase
          .from("boards")
          .select("title, board_date")
          .eq("id", boardId)
          .single();
        if (boardData) {
          setBoardTitle(boardData.title);
          setBoardDate(boardData.board_date || "");
        }
  ```

- [ ] **Step 3: Implement datetime-local formatting and update functions**
  In `src/app/board/[id]/page.tsx`, add the helper `formatForInput` and logic to update the board date in database (around line 160):
  ```typescript
    const formatForInput = (isoStr: string | null) => {
      if (!isoStr) return "";
      const d = new Date(isoStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleUpdateBoardDate = async (newVal: string) => {
      if (!newVal) {
        setIsEditingDate(false);
        return;
      }
      try {
        const isoVal = new Date(newVal).toISOString();
        const { error } = await supabase
          .from("boards")
          .update({ board_date: isoVal })
          .eq("id", boardId);

        if (error) throw error;
        setBoardDate(isoVal);
        window.dispatchEvent(new Event("reload-folders-and-boards"));
      } catch (err) {
        console.error("Lỗi cập nhật ngày của bảng:", err);
      } finally {
        setIsEditingDate(false);
      }
    };
  ```

- [ ] **Step 4: Update workspace date display UI and double-click trigger**
  In `src/app/board/[id]/page.tsx`, replace the read-only date display inside the header rendering (around lines 643-655):
  ```tsx
              <div className="flex items-center gap-2">
                <h1 className="text-[10px] font-bold tracking-wider text-violet-700 uppercase leading-none">Workspace</h1>
                {isEditingDate ? (
                  <input
                    type="datetime-local"
                    value={editDateVal}
                    onChange={(e) => setEditDateVal(e.target.value)}
                    onBlur={() => handleUpdateBoardDate(editDateVal)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateBoardDate(editDateVal);
                      if (e.key === "Escape") setIsEditingDate(false);
                    }}
                    className="bg-white/90 backdrop-blur-md rounded-lg border border-violet-300 text-[10px] text-slate-800 outline-none px-1.5 py-0.5 focus:ring-2 focus:ring-violet-200/50 leading-none h-5"
                    autoFocus
                  />
                ) : (
                  boardDate && (
                    <span
                      className="text-[9px] text-slate-400 font-normal select-none leading-none cursor-pointer border-b border-dashed border-slate-300 hover:border-slate-500 hover:text-slate-600 transition"
                      onDoubleClick={() => {
                        setIsEditingDate(true);
                        setEditDateVal(formatForInput(boardDate));
                      }}
                      title="Nhấp đúp để chỉnh sửa ngày bảng"
                    >
                      (Ngày: {new Date(boardDate).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })})
                    </span>
                  )
                )}
              </div>
  ```

- [ ] **Step 5: Verify build & tests**
  Run: `npm run test`
  Expected: All tests pass.
  Run: `npm run build`
  Expected: Compilation succeeds.

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add src/app/board/[id]/page.tsx
  git commit -m "feat: make board date editable via double-click next to workspace header"
  ```
