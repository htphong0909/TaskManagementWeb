# Column Description and Double-Click Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an editable description (subtitle) for columns (lists) in the Kanban board, and transition editing triggers (column title, column description) to require a double-click.

**Architecture:** Database schema will be updated to store `description` in the `lists` table. The React page and components will fetch the description, manage the input state, and handle DB updates. All title and subtitle edits will use `onDoubleClick` instead of `onClick`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase.

## Global Constraints
- TypeScript types must be fully defined (no `any`).
- Use Tailwind CSS v4 for layouts.
- Edit actions for column title, column description, and card title must all be double-click to edit.

---

### Task 1: Database Schema Migration

**Files:**
- Create: `supabase/migrations/20260714093000_add_description_to_lists.sql`

**Interfaces:**
- Consumes: None
- Produces: `description` TEXT column on the `lists` table.

- [ ] **Step 1: Create SQL Migration File**
  Write SQL to add `description` column to the `lists` table.
  ```sql
  -- Add description to lists table
  ALTER TABLE public.lists ADD COLUMN description TEXT;
  ```

- [ ] **Step 2: Push database schema change to Supabase**
  Run: `npx supabase db push`
  Expected: Command finishes successfully with exit code 0.

- [ ] **Step 3: Commit migration**
  ```bash
  git add supabase/migrations/20260714093000_add_description_to_lists.sql
  git commit -m "migration: add description column to lists"
  ```

---

### Task 2: Update Page State and Queries

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

**Interfaces:**
- Consumes: Database schema from Task 1.
- Produces: Updated list fetching and column description edit state handlers.

- [ ] **Step 1: Update List interface in page.tsx**
  Modify the `List` interface (approx. lines 11-15) to:
  ```typescript
  interface List {
    id: string;
    title: string;
    position: number;
    description?: string | null;
  }
  ```

- [ ] **Step 2: Fetch description in fetchBoardData**
  Update list select query (approx. line 123) to:
  ```typescript
  const { data: listData } = await supabase
    .from("lists")
    .select("id, title, position, description")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  ```

- [ ] **Step 3: Add state hooks for description editing**
  Add state hooks for list description editing (approx. line 41):
  ```typescript
  const [editingListDescId, setEditingListDescId] = useState<string | null>(null);
  const [editListDesc, setEditListDesc] = useState("");
  ```

- [ ] **Step 4: Add description submit handler**
  Add `handleRenameListDescSubmit` (approx. line 203, after `handleRenameListSubmit`):
  ```typescript
  const handleRenameListDescSubmit = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lists")
        .update({ description: editListDesc.trim() || null })
        .eq("id", id);

      if (error) throw error;
      setEditingListDescId(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi đổi mô tả cột:", err);
    }
  };
  ```

- [ ] **Step 5: Pass new props to BoardColumn**
  In the JSX render block, pass the new states and callback to the `BoardColumn` component (approx. line 638):
  ```typescript
  editingListDescId={editingListDescId}
  setEditingListDescId={setEditingListDescId}
  editListDesc={editListDesc}
  setEditListDesc={setEditListDesc}
  handleRenameListDescSubmit={handleRenameListDescSubmit}
  ```

- [ ] **Step 6: Commit changes**
  ```bash
  git add src/app/board/\[id\]/page.tsx
  git commit -m "feat: add list description state and handlers to board page"
  ```

---

### Task 3: Modify BoardColumn Component

**Files:**
- Modify: `src/components/BoardColumn.tsx`

**Interfaces:**
- Consumes: Props and types defined in Task 2.
- Produces: Updated user interface rendering column title/description with double-click edit capability.

- [ ] **Step 1: Update interfaces in BoardColumn.tsx**
  Update `List` (approx. lines 4-8):
  ```typescript
  interface List {
    id: string;
    title: string;
    position: number;
    description?: string | null;
  }
  ```
  Update `BoardColumnProps` (approx. lines 21-66) to add:
  ```typescript
  editingListDescId: string | null;
  setEditingListDescId: (id: string | null) => void;
  editListDesc: string;
  setEditListDesc: (desc: string) => void;
  handleRenameListDescSubmit: (id: string) => void;
  ```

- [ ] **Step 2: Destructure new props in BoardColumn**
  Update parameters list in `BoardColumn` (approx. lines 68-109) to destructure the 5 new props.

- [ ] **Step 3: Modify column title editing to double click**
  Change the title element trigger from `onClick` to `onDoubleClick` (approx. line 160):
  ```typescript
  onDoubleClick={() => [setEditingListId(list.id), setEditListTitle(list.title)]}
  ```

- [ ] **Step 4: Render column subtitle/description below title**
  Add the description rendering section right below the title/input block in the header area.
  ```typescript
  {/* Subtitle / Description cột */}
  <div className="w-full mt-1.5 min-h-[16px]">
    {list.id === editingListDescId ? (
      <input
        type="text"
        value={editListDesc}
        onChange={(e) => setEditListDesc(e.target.value)}
        onBlur={() => handleRenameListDescSubmit(list.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRenameListDescSubmit(list.id);
          if (e.key === "Escape") setEditingListDescId(null);
        }}
        className="bg-white border border-violet-400 outline-none text-[11px] font-normal text-slate-600 rounded-lg px-2 py-0.5 w-full block text-left"
        autoFocus
        placeholder="Nhập mô tả cột..."
      />
    ) : (
      <span
        onDoubleClick={() => [setEditingListDescId(list.id), setEditListDesc(list.description || "")]}
        className={`text-[11px] leading-relaxed font-normal text-left break-words block w-full select-none cursor-pointer ${
          list.description ? "text-slate-500/80" : "text-slate-400/40 italic hover:text-slate-400/80"
        }`}
        title="Double click để sửa mô tả cột"
      >
        {list.description || "+ Thêm mô tả..."}
      </span>
    )}
  </div>
  ```

- [ ] **Step 5: Run tests and check code correctness**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 6: Commit changes**
  ```bash
  git add src/components/BoardColumn.tsx
  git commit -m "feat: implement double-click edit for column title and subtitle/description"
  ```
