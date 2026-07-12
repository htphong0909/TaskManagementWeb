# Thiết kế: Tái cấu trúc cấu trúc Component Board & Tích hợp Kéo thả Drag and Drop

Tài liệu này đặc tả kỹ thuật cho giải pháp tái cấu trúc cấu trúc Kanban Board thành các Component độc lập, click outside để tự động lưu mô tả, và tích hợp cơ chế kéo thả cột/thẻ bằng HTML5 Drag and Drop API đồng bộ tức thời với cơ sở dữ liệu Supabase.

---

## 1. Tự động lưu mô tả khi click ngoài (Click Outside)
- Bổ sung `useRef` bọc phần soạn thảo Markdown trong `CardPopover.tsx`.
- Khi ở chế độ chỉnh sửa, đăng ký lắng nghe sự kiện `mousedown` trên toàn bộ tài liệu.
- Nếu điểm click chuột nằm ngoài khu vực của `ref` này, tự động kích hoạt `handleSaveDescription()` để lưu nội dung và đóng ô chỉnh sửa.

---

## 2. Kiến trúc Component phân rã (Component Decomposition)
Chúng ta sẽ chia tách tệp `src/app/board/[id]/page.tsx` thành:

### A. Component `BoardCard.tsx`
- **Tệp mới:** `src/components/BoardCard.tsx`
- **Trách nhiệm:** Hiển thị thẻ đơn lẻ, thời hạn, ngày tạo, các hiệu ứng hover mở popover, kích hoạt kéo thả thẻ.
- **Thuộc tính (Props):**
  ```typescript
  interface BoardCardProps {
    card: any;
    isEditingCard: boolean;
    editCardTitle: string;
    setEditCardTitle: (title: string) => void;
    editingCardId: string | null;
    setEditingCardId: (id: string | null) => void;
    handleRenameCardSubmit: (id: string) => void;
    setCardToDelete: (card: any) => void;
    handleCardMouseEnter: (card: any, event: React.MouseEvent<HTMLDivElement>) => void;
    handleCardMouseLeave: () => void;
    // Drag & Drop handlers
    onDragStart: (e: React.DragEvent, cardId: string, listId: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetCardId: string) => void;
  }
  ```

### B. Component `BoardColumn.tsx`
- **Tệp mới:** `src/components/BoardColumn.tsx`
- **Trách nhiệm:** Hiển thị một cột danh sách, tiêu đề cột, form thêm thẻ mới cho cột đó, render danh sách các BoardCard.
- **Thuộc tính (Props):**
  ```typescript
  interface BoardColumnProps {
    list: any;
    listCards: any[];
    editingListId: string | null;
    setEditingListId: (id: string | null) => void;
    editListTitle: string;
    setEditListTitle: (title: string) => void;
    handleRenameListSubmit: (id: string) => void;
    setListToDelete: (list: any) => void;
    // Card Form states/handlers
    addingCardListId: string | null;
    setAddingCardListId: (id: string | null) => void;
    newCardTitle: string;
    setNewCardTitle: (title: string) => void;
    newCardDueDate: string;
    setNewCardDueDate: (date: string) => void;
    handleAddCardSubmit: (e: React.FormEvent, listId: string) => void;
    // Render BoardCard helpers
    editingCardId: string | null;
    setEditingCardId: (id: string | null) => void;
    editCardTitle: string;
    setEditCardTitle: (title: string) => void;
    handleRenameCardSubmit: (id: string) => void;
    setCardToDelete: (card: any) => void;
    handleCardMouseEnter: (card: any, event: React.MouseEvent<HTMLDivElement>) => void;
    handleCardMouseLeave: () => void;
    // Drag & Drop handlers
    onDragStartList: (e: React.DragEvent, listId: string) => void;
    onDragOverList: (e: React.DragEvent) => void;
    onDropList: (e: React.DragEvent, targetListId: string) => void;
    onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
    onDragEndCard: (e: React.DragEvent) => void;
    onCardDropOnList: (e: React.DragEvent, targetListId: string) => void;
    onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
  }
  ```

---

## 3. Đặc tả kéo thả Drag & Drop (HTML5 Native Drag & Drop)
- **Kéo thả Cột (Lists):**
  - Khi kéo cột, sự kiện `onDragStartList` lưu `listId` dưới khóa `"text/list-id"`.
  - Khi cột A thả lên cột B (`onDropList`), chúng ta tìm vị trí của cột B, lấy các cột lân cận để tính toán ra trị số `position` mới (ví dụ trung bình cộng `position` cột trước và sau).
  - Gửi lệnh `update` thuộc tính `position` của cột A lên Supabase bảng `lists`.
- **Kéo thả Thẻ (Cards):**
  - Khi kéo thẻ, sự kiện `onDragStartCard` lưu `cardId` dưới khóa `"text/card-id"` và `listId` dưới khóa `"text/source-list-id"`.
  - **Thả lên cột trống:** Khi thả thẻ lên cột B (`onCardDropOnList`), cập nhật `list_id` của thẻ đó thành ID của cột B, đặt `position` ở cuối danh sách.
  - **Thả đè lên thẻ khác để xếp thứ tự:** Khi thả thẻ A lên trên thẻ B (`onCardDropOnCard`), cập nhật `list_id` của thẻ A thành `list_id` của thẻ B, tính toán `position` của thẻ A đứng trước/sau thẻ B một lượng nhỏ để sắp xếp chính xác.
  - Sau mỗi sự kiện drop, cập nhật dữ liệu tương ứng lên Supabase bảng `cards` và reload board.
