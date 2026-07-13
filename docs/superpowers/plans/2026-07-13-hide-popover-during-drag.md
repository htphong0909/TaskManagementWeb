# Hide Popover During Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ẩn Popover chi tiết thẻ khi bắt đầu thực hiện kéo thả và không mở Popover mới trong suốt quá trình kéo thẻ/cột.

**Architecture:** Cập nhật các hàm `handleCardDragStart`, `handleListDragStart` và `handleCardMouseEnter` trong file [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) để dọn dẹp trạng thái hover khi drag start và chặn hover khi đang có card/list được kéo.

**Tech Stack:** Next.js (React 19), Tailwind CSS v4, TypeScript, Vitest

## Global Constraints

- TypeScript 100% không cảnh báo hoặc lỗi.
- Không phá vỡ RLS và các cấu hình API Supabase.

---

### Task 1: Cập nhật các hàm xử lý kéo thả và hover trong page.tsx

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Cập nhật handleCardDragStart**

Sửa đổi hàm `handleCardDragStart` trong file [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) để đóng Popover ngay khi bắt đầu kéo:

```typescript
  const handleCardDragStart = (e: React.DragEvent, cardId: string, listId: string) => {
    setHoveredCard(null);
    setHoveredRect(null);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    e.dataTransfer.setData("text/card-id", cardId);
    e.dataTransfer.setData("text/source-list-id", listId);
    setActiveDragCardId(cardId);
  };
```

- [ ] **Step 2: Cập nhật handleListDragStart**

Sửa đổi hàm `handleListDragStart` trong file [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) để đóng Popover ngay khi bắt đầu kéo cột:

```typescript
  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    setHoveredCard(null);
    setHoveredRect(null);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    e.dataTransfer.setData("text/list-id", listId);
    setActiveDragListId(listId);
  };
```

- [ ] **Step 3: Cập nhật handleCardMouseEnter**

Sửa đổi hàm `handleCardMouseEnter` trong file [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) để chặn mở Popover mới khi đang kéo thẻ/cột:

```typescript
  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    if (activeDragCardId || activeDragListId) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard(card);
    setHoveredRect(rect);
  };
```

- [ ] **Step 4: Chạy kiểm tra lint và build tại local**

Đảm bảo thay đổi không gây lỗi TypeScript hoặc build.
Chạy command:
```powershell
npm run lint
npm run build
```
Kết quả mong đợi: Dự án biên dịch thành công mà không có lỗi.

- [ ] **Step 5: Chạy bộ kiểm thử (test suite)**

Chạy command:
```powershell
npm run test
```
Kết quả mong đợi: Các test cases chạy thành công.

- [ ] **Step 6: Commit thay đổi**

Chạy các lệnh git để lưu lại thay đổi:
```bash
git add src/app/board/[id]/page.tsx
git commit -m "fix: hide card detail popover immediately on drag start and prevent new popovers during drag"
```
