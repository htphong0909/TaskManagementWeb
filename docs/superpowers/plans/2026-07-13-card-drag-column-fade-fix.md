# Card Drag Column Fade Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi kéo card từ cột này qua cột khác làm cột nguồn bị kẹt ở trạng thái mờ (opacity thấp).

**Architecture:** Sử dụng `e.stopPropagation()` tại các sự kiện `onDragStart` và `onDragEnd` của component `BoardCard` để ngăn chặn sự kiện kéo thả nổi bọt lên component cha `BoardColumn`.

**Tech Stack:** Next.js (React 19), Tailwind CSS v4, TypeScript, Vitest

## Global Constraints

- TypeScript 100% không cảnh báo hoặc lỗi.
- Không phá vỡ RLS và các cấu hình API Supabase.

---

### Task 1: Ngăn chặn nổi bọt sự kiện kéo thẻ trong BoardCard.tsx

**Files:**
- Modify: `src/components/BoardCard.tsx:96-105`

- [ ] **Step 1: Cập nhật hàm xử lý onDragStart và onDragEnd trong BoardCard.tsx**

Sửa đổi phần thuộc tính `onDragStart` và `onDragEnd` của thẻ `div` bọc ngoài cùng trong file [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx) để thêm `e.stopPropagation()` trước khi gọi callback tương ứng:

```tsx
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStartCard(e, card.id, card.list_id);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEndCard(e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard(e, card.id);
      }}
      onDragLeave={onDragLeaveCard}
      onDrop={(e) => onCardDropOnCard(e, card.id)}
```

- [ ] **Step 2: Chạy kiểm tra lint và build tại local**

Đảm bảo thay đổi không gây lỗi TypeScript hoặc build.
Chạy command:
```powershell
npm run lint
npm run build
```
Kết quả mong đợi: Dự án biên dịch thành công mà không có lỗi.

- [ ] **Step 3: Chạy bộ kiểm thử (test suite)**

Chạy command:
```powershell
npm run test
```
Kết quả mong đợi: Các test cases chạy thành công.

- [ ] **Step 4: Commit thay đổi**

Chạy các lệnh git để lưu lại thay đổi:
```bash
git add src/components/BoardCard.tsx
git commit -m "fix: stop dragstart and dragend event bubbling in BoardCard to prevent column stuck in faded state"
```
