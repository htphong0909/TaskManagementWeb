# Tối Ưu Hóa Chiều Cao Cột & Quản Lý Hoàn Thành & Deadline Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi tràn chiều cao của các cột công việc và bổ sung các trường cấu hình trạng thái hoàn thành và ngày hết hạn hạn chót trực quan ở cả thẻ card ngoài bảng và modal chi tiết.

**Architecture:** 
- Tối ưu hóa lại layout CSS Flexbox trong Next.js để chiều cao cột co giãn động khép kín theo parent `h-[92%]`.
- Tạo migration schema mở rộng bảng `cards` với trường `is_completed` kiểu boolean.
- Tái cấu trúc giao diện Modal thành Grid 3 phần với cột phải (sidebar) quản lý thuộc tính bật/tắt deadline và checkbox hoàn thành.

**Tech Stack:** Next.js, React, Tailwind CSS, Supabase PostgreSQL, TypeScript.

## Global Constraints
- React/Next.js components should follow strict TypeScript typing.
- Database alterations must be pushed via Supabase CLI.
- All styles must use clean Tailwind class combinations.

---

### Task 1: Database Schema Migration

**Files:**
- Create: `supabase/migrations/20260713231651_add_is_completed_to_cards.sql`

**Interfaces:**
- Consumes: None
- Produces: `is_completed` BOOLEAN column on the `cards` table in the database schema.

- [ ] **Step 1: Create SQL Migration File**
  Write SQL to add `is_completed` column to the `cards` table.
  ```sql
  -- Add is_completed to cards table
  ALTER TABLE cards ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE;
  ```

- [ ] **Step 2: Push database schema change to local/remote Supabase**
  Run: `npx supabase db push`
  Expected: Command finishes successfully with exit code 0.

- [ ] **Step 3: Commit migration**
  ```bash
  git add supabase/migrations/20260713231651_add_is_completed_to_cards.sql
  git commit -m "migration: add is_completed column to cards"
  ```

---

### Task 2: Optimize Board Column Heights

**Files:**
- Modify: `src/app/board/[id]/page.tsx:556-560`
- Modify: `src/components/BoardColumn.tsx:135-140`

**Interfaces:**
- Consumes: Workspace height constraints from parent layout.
- Produces: Responsive vertical alignment of Board Columns without switcher bar overlapping.

- [ ] **Step 1: Modify page.tsx container class**
  Change wrapper class from `h-screen` to `h-full` to fit exactly in its `h-[92%]` layout container.
  ```diff
  -    <div className="h-screen bg-gradient-to-tr from-[#bae6fd] via-[#c7d2fe] to-[#e0e7ff] p-6 flex flex-col gap-6 text-slate-800 relative overflow-hidden">
  +    <div className="h-full bg-gradient-to-tr from-[#bae6fd] via-[#c7d2fe] to-[#e0e7ff] p-6 flex flex-col gap-6 text-slate-800 relative overflow-hidden">
  ```

- [ ] **Step 2: Modify BoardColumn.tsx container class**
  Replace `max-h-[80vh]` with `max-h-full` to allow column wrapper to utilize full remaining height of columns-area.
  ```diff
  -    <div
  -      className={`w-72 bg-slate-50/80 backdrop-blur-md border border-slate-100 rounded-2xl p-4 flex flex-col max-h-[80vh] shrink-0
  +    <div
  +      className={`w-72 bg-slate-50/80 backdrop-blur-md border border-slate-100 rounded-2xl p-4 flex flex-col max-h-full shrink-0
  ```

- [ ] **Step 3: Run project build to verify correct formatting**
  Run: `npm run build`
  Expected: Successful compilation without errors.

- [ ] **Step 4: Commit column height optimizations**
  ```bash
  git add src/app/board/[id]/page.tsx src/components/BoardColumn.tsx
  git commit -m "layout: fix board column height overflow and switcher overlap"
  ```

---

### Task 3: BoardCard Completion and Deadline Updates

**Files:**
- Modify: `src/components/BoardCard.tsx:3-35`, `BoardCard.tsx:60-98`, `BoardCard.tsx:162-172`
- Modify: `src/app/board/[id]/page.tsx:265-275`, `page.tsx:680-698`

**Interfaces:**
- Consumes: `is_completed` field from Card database object.
- Produces: Checkbox toggler in board cards with instant Supabase update and Emerald deadline indicators.

- [ ] **Step 1: Update Card interface and Props in BoardCard.tsx**
  Add `is_completed` to Card interface and `onToggleComplete` callback parameter.
  ```typescript
  interface Card {
    id: string;
    list_id: string;
    title: string;
    content: string | null;
    position: number;
    due_date: string | null;
    created_at: string;
    is_completed?: boolean;
  }
  
  interface BoardCardProps {
    card: Card;
    // other props...
    onToggleComplete?: (cardId: string, isCompleted: boolean) => void;
  }
  ```

- [ ] **Step 2: Update Deadline Style Logic in BoardCard.tsx**
  Modify `getDeadlineStyleAndText` to format completed deadlines as green emerald indicators.
  ```typescript
    const getDeadlineStyleAndText = (dueDateStr: string | null) => {
      if (!dueDateStr) return null;
      const now = new Date();
      const due = new Date(dueDateStr);
      const timeDiff = due.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
      let className = "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold w-fit ";
      let text = "";
  
      const formatTime = (d: Date) => {
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${hours}:${minutes} ${day}/${month}`;
      };
  
      if (card.is_completed) {
        className += "bg-emerald-50 text-emerald-600 border border-emerald-100";
        text = `Hoàn thành (${formatTime(due)})`;
      } else if (timeDiff < 0) {
        className += "bg-rose-50 text-rose-600 border border-rose-100";
        text = `Quá hạn (${formatTime(due)})`;
      } else if (daysDiff <= 1) {
        className += "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse";
        text = `Sắp hết hạn (${formatTime(due)})`;
      } else {
        className += "bg-emerald-50 text-emerald-600 border border-emerald-100";
        text = `Hạn chót: ${formatTime(due)}`;
      }
  
      return { className, text };
    };
  ```

- [ ] **Step 3: Render Checkbox in BoardCard.tsx JSX**
  Insert a checkmark toggle checkbox input to the left of the card title at lines 162-169.
  ```tsx
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={card.is_completed || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleComplete?.(card.id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer flex-shrink-0 mt-0.5"
            />
            <span className="text-xs font-semibold text-slate-700 text-left select-none break-words line-clamp-2 pr-4 flex-1">
              {card.title}
            </span>
          </div>
  ```

- [ ] **Step 4: Implement onToggleComplete Handler in page.tsx**
  Add database update handler `handleCardToggleComplete` and pass it down to `BoardColumn` and `BoardCard`.
  ```typescript
    const handleCardToggleComplete = async (cardId: string, isCompleted: boolean) => {
      try {
        const { error } = await supabase
          .from("cards")
          .update({ is_completed: isCompleted })
          .eq("id", cardId);
        if (error) throw error;
        fetchBoardData();
      } catch (err) {
        console.error("Lỗi cập nhật trạng thái hoàn thành:", err);
      }
    };
  ```
  Pass `onToggleComplete={handleCardToggleComplete}` to `<BoardColumn>` mapping, and inside `BoardColumn` pass it to `<BoardCard>`.

- [ ] **Step 5: Run tests and verify build success**
  Run: `npm run lint` and `npm run test`
  Expected: All checks and tests pass.

- [ ] **Step 6: Commit BoardCard updates**
  ```bash
  git add src/components/BoardCard.tsx src/components/BoardColumn.tsx src/app/board/[id]/page.tsx
  git commit -m "feat: integrate card completion checkbox and update deadline styles"
  ```

---

### Task 4: CardDetailModal Config Sidebar

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Interfaces:**
- Consumes: `is_completed` and `due_date` fields from Card database object.
- Produces: Config sidebar in CardDetailModal with checkboxes for completion toggle, deadline toggle, and datetime inputs.

- [ ] **Step 1: Update Card interface in CardDetailModal.tsx**
  Add `is_completed` to local Card interface at top of file.
  ```typescript
  interface Card {
    id: string;
    list_id: string;
    title: string;
    content: string | null;
    position: number;
    due_date: string | null;
    created_at: string;
    details: string | null;
    key_info: string | null;
    stakeholders: Stakeholder[];
    is_completed?: boolean;
  }
  ```

- [ ] **Step 2: Add modal config states**
  Inside `CardDetailModal` component:
  ```typescript
    const [isCompleted, setIsCompleted] = useState(card.is_completed || false);
    const [hasDeadline, setHasDeadline] = useState(!!card.due_date);
    const [dueDate, setDueDate] = useState("");
  
    // Helper to format ISO to datetime-local values (YYYY-MM-DDTHH:mm)
    const formatForInput = (isoStr: string | null) => {
      if (!isoStr) return "";
      const d = new Date(isoStr);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
  
    // Sync states when modal loaded or card data updated
    useEffect(() => {
      setIsCompleted(card.is_completed || false);
      setHasDeadline(!!card.due_date);
      setDueDate(formatForInput(card.due_date));
    }, [card]);
  ```

- [ ] **Step 3: Implement settings handlers**
  ```typescript
    const handleToggleCompletedInModal = async (completed: boolean) => {
      setIsCompleted(completed);
      await saveField("is_completed", completed);
    };
  
    const handleToggleDeadlineEnable = async (enabled: boolean) => {
      setHasDeadline(enabled);
      if (enabled) {
        // Set default deadline to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setMinutes(0);
        const iso = tomorrow.toISOString();
        setDueDate(formatForInput(iso));
        await saveField("due_date", iso);
      } else {
        setDueDate("");
        await saveField("due_date", null);
      }
    };
  
    const handleDueDateChange = async (val: string) => {
      setDueDate(val);
      if (val) {
        const iso = new Date(val).toISOString();
        await saveField("due_date", iso);
      } else {
        await saveField("due_date", null);
      }
    };
  ```

- [ ] **Step 4: Update Modal Layout grid and Add right sidebar**
  Transform the grid inside modal body from simple col-span-2 to a full 3-column system with a right settings sidebar (`col-span-1`).
  At line ~1208 (right before the left column closing tag):
  ```tsx
              {/* CỘT PHẢI (Cấu hình & Thiết lập - 1/3 width) */}
              <div className="col-span-1 flex flex-col gap-6">
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">⚙️ Thiết lập thẻ</label>
                  
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
  
                  <hr className="border-slate-100" />
  
                  {/* Thiết lập Hạn chót */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        id="enable-deadline-checkbox"
                        checked={hasDeadline}
                        onChange={(e) => handleToggleDeadlineEnable(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <label htmlFor="enable-deadline-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Bật hạn chót (Deadline)
                      </label>
                    </div>
  
                    {hasDeadline && (
                      <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40"
                      />
                    )}
                  </div>
                </div>
              </div>
  ```

- [ ] **Step 5: Run linter and verify Next.js build compilation**
  Run: `npm run lint` and `npm run build`
  Expected: Pass without errors.

- [ ] **Step 6: Commit CardDetailModal updates**
  ```bash
  git add src/components/CardDetailModal.tsx
  git commit -m "feat: implement configuration sidebar with completion and deadline toggle in modal"
  ```
