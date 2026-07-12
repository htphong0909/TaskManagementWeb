# Thiết kế: Hiệu ứng Kéo thả Drag and Drop cao cấp

Tài liệu này đặc tả kỹ thuật cho việc nâng cấp trải nghiệm người dùng kéo thả (Drag and Drop) cột và thẻ với trọn bộ hiệu ứng thị giác mượt mà và trực quan.

---

## 1. Trạng thái kéo thả toàn cục (Global Drag States)
Chúng ta bổ sung thêm các state quản lý đối tượng đang kéo và đối tượng đang bị di chuột đè lên (hovered drop target) trong `src/app/board/[id]/page.tsx`:

- `activeDragCardId`: ID của card đang được kéo.
- `activeDragListId`: ID của list/column đang được kéo.
- `dragOverCardId`: ID của card đang bị di chuột đè lên (được làm mục tiêu thả).
- `dragOverListId`: ID của list/column đang bị di chuột đè lên.

---

## 2. Đặc tả các hiệu ứng thị giác (Visual Effects Spec)

### A. Hiệu ứng Ghost Placeholder (Thẻ/Cột gốc khi đang kéo)
- **CSS class:** `opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]`
- **Áp dụng:**
  - Với card: khi `card.id === activeDragCardId`.
  - Với list: khi `list.id === activeDragListId`.

### B. Hiệu ứng Drop Indicator Line (Đường kẻ chỉ định vị trí trên thẻ mục tiêu)
- **CSS class:** `border-t-4 border-t-violet-500 pt-1 shadow-sm`
- **Áp dụng:** Khi `card.id === dragOverCardId` và `activeDragCardId` đang hoạt động (không tự hiển thị đường kẻ khi kéo thẻ lên chính nó).

### C. Hiệu ứng Column Drop Zone Hover (Cột mục tiêu tiếp nhận thẻ)
- **CSS class:** `ring-2 ring-violet-400 ring-offset-2 shadow-md bg-white/90`
- **Áp dụng:** Khi `list.id === dragOverListId` và `activeDragCardId` đang hoạt động (đang kéo thẻ trên cột đó).

---

## 3. Bản đồ phân phối Props
Chúng ta truyền thêm các thuộc tính drag state và drag handlers mới xuống components con:

### Props cập nhật cho `BoardCard`
- `activeDragCardId`: `string | null`
- `dragOverCardId`: `string | null`
- `onDragLeaveCard`: `(e: React.DragEvent) => void`
- `onDragOverCard`: `(e: React.DragEvent, cardId: string) => void`

### Props cập nhật cho `BoardColumn`
- `activeDragCardId`: `string | null`
- `activeDragListId`: `string | null`
- `dragOverListId`: `string | null`
- `dragOverCardId`: `string | null`
- `onDragOverList`: `(e: React.DragEvent, listId: string) => void`
- `onDragLeaveList`: `(e: React.DragEvent) => void`
- `onDragLeaveCard`: `(e: React.DragEvent) => void`
- `onDragOverCard`: `(e: React.DragEvent, cardId: string) => void`
