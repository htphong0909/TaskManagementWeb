# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc và chi tiết công việc khi chuyển tab, giới hạn chiều cao popover, bẻ dòng URL dài có chọn lọc không bẻ dòng văn bản thường, mặc định mở tab Preview khi mở Modal, và tăng tốc độ đóng/mở popover.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc và chi tiết công việc, bao gồm dependencies `isDescPreview` và `isPreviewMode`.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto` và biến đổi mô tả công việc thành auto-save khi blur, không dùng nút bấm, render bằng `marked`, và loại bỏ class transition để hiển thị tức thì.
- Cập nhật [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) rút ngắn thời gian timeout chờ đóng popover từ `200ms` xuống `100ms`.
- Cập nhật [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để mô tả công việc và chi tiết công việc hỗ trợ nút Soạn thảo / Xem trước (cả 2 đều mặc định mở Xem trước), render bằng `marked`, bổ sung toolbar chèn ảnh và dán ảnh.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng chọn lọc: Văn bản và textarea bẻ dòng theo từ, chỉ liên kết `a` trong markdown bẻ dòng theo ký tự (`break-all`).

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Rút ngắn thời gian trễ đóng Popover trong page.tsx

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Thay thế 200ms bằng 100ms trong handleCardMouseLeave và handlePopoverMouseLeave**

Sửa đổi thời gian chờ timeout đóng popover:

```typescript
  const handleCardMouseLeave = () => {
    if (isPopoverBusy) return;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }, 100); // 200ms -> 100ms
  };
```

```typescript
  const handlePopoverMouseLeave = () => {
    if (isPopoverBusy) return;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }, 100); // 200ms -> 100ms
  };
```

- [ ] **Step 2: Commit page.tsx**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "perf: reduce CardPopover close delay to 100ms for faster responsiveness"
```

---

### Task 2: Loại bỏ transition trễ trong CardPopover.tsx

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Loại bỏ transition class khỏi div container của CardPopover**

Sửa đổi class trong [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) bằng cách xóa `transition-all duration-200`:

```tsx
    <div
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/40 p-5 z-50 overflow-y-auto"
      style={{
        left: `${leftPosition}px`,
        ...(isLowerHalf ? { bottom: `${bottomPosition}px` } : { top: `${topPosition}px` }),
        width: `${popupWidth}px`,
        maxHeight: `${maxH}px`,
      }}
    >
```

- [ ] **Step 2: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 3: Commit và push toàn bộ thay đổi**

```bash
git add src/components/CardPopover.tsx
git commit -m "perf: remove transition animation from CardPopover for instant displaying"
git push
```
