# Quản lý Thẻ công việc (Cards Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai các tính năng hiển thị thẻ, thêm thẻ mới (kèm chọn deadline), sửa tiêu đề thẻ trực tiếp (inline) và xóa thẻ.

**Architecture:**
- **Database:** Tạo file migration SQL bổ sung cột `due_date` cho bảng `cards`.
- **BoardDetailPage (`src/app/board/[id]/page.tsx`):**
  - Quản lý các trạng thái thêm thẻ mới theo từng cột (`addingCardListId`, `newCardTitle`, `newCardDueDate`).
  - Quản lý các trạng thái sửa tên thẻ (`editingCardId`, `editCardTitle`).
  - Quản lý trạng thái xóa thẻ (`cardToDelete`) và hiển thị Modal xác nhận qua React Portal.
  - Các hàm gọi Supabase API: `handleAddCard`, `handleRenameCard`, `handleDeleteCard`.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, Supabase JS, Vitest.

---

### Task 1: Tạo file migration SQL bổ sung cột `due_date` cho bảng `cards`

**Files:**
- Create: `supabase/migrations/20260712161500_add_due_date_to_cards.sql`

- [ ] **Step 1: Tạo file SQL migration**

Tạo file `supabase/migrations/20260712161500_add_due_date_to_cards.sql` với câu lệnh:

```sql
-- Thêm cột due_date cho bảng cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260712161500_add_due_date_to_cards.sql
git commit -m "db: add due_date column to cards table migration"
```

---

### Task 2: Cập nhật trang `/board/[id]/page.tsx` với logic quản lý Thẻ

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Cập nhật mã nguồn của `src/app/board/[id]/page.tsx`**

Cập nhật `src/app/board/[id]/page.tsx` để tích hợp đầy đủ UI/UX thêm, sửa inline, xóa thẻ công việc và hiển thị ngày tạo, deadline:

(Mã nguồn đầy đủ đã được cập nhật vào tệp page.tsx)

- [ ] **Step 2: Commit các thay đổi của page.tsx**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: implement board cards management layout and handlers"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Chạy build sản phẩm**

Run: `npm run build`
Expected: PASS
