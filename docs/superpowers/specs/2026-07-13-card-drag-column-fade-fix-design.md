# Thiết kế: Khắc phục lỗi kẹt trạng thái mờ của cột khi kéo thẻ (Card Drag Column Fade Fix)

Tài liệu này đặc tả nguyên nhân và giải pháp kỹ thuật giải quyết lỗi cột bị kẹt ở trạng thái mờ (opacity thấp) sau khi kéo thả các thẻ (cards) từ cột này sang cột khác.

---

## 1. Phân tích nguyên nhân gốc rễ (Root Cause)

Trong cơ chế HTML5 Drag and Drop, sự kiện `dragstart` và `dragend` có hành vi nổi bọt (event bubbling). Khi xảy ra thao tác kéo thả trên Kanban Board:

1. Người dùng bắt đầu kéo một Thẻ công việc (`BoardCard`).
2. Sự kiện `dragstart` kích hoạt trên `BoardCard`.
3. Do sự kiện nổi bọt, sự kiện `dragstart` tiếp tục lan truyền lên phần tử cha là Cột chứa nó (`BoardColumn`).
4. Handler `onDragStartList` trên `BoardColumn` nhận sự kiện này và thiết lập trạng thái kéo cho cột:
   - Gán `activeDragListId` bằng ID của cột nguồn.
   - Khiến giao diện của cột nguồn áp dụng CSS style mờ (`opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]`).
5. Khi người dùng hoàn tất kéo và thả thẻ:
   - Chỉ sự kiện `onDragEnd` trên `BoardCard` được kích hoạt và xử lý qua `onDragEndCard`, đặt các trạng thái kéo thẻ về `null`.
   - Sự kiện `onDragEnd` của cột (`onDragEndList`) không được kích hoạt đúng cách hoặc không đồng bộ cho cột nguồn, khiến `activeDragListId` vẫn giữ nguyên giá trị ID của cột đó.
   - Kết quả: Cột nguồn bị kẹt vĩnh viễn ở trạng thái mờ (`opacity-30`) cho đến khi tải lại trang.

---

## 2. Giải pháp khắc phục (Solution)

Để cô lập sự kiện kéo thẻ và kéo cột riêng biệt, chúng ta cần ngăn chặn sự kiện kéo thẻ nổi bọt lên cột cha:

- **Chặn nổi bọt sự kiện kéo thẻ:** Trong component [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx), thêm lệnh `e.stopPropagation()` vào bên trong hai hàm xử lý sự kiện kéo thả chính của card:
  - `onDragStart`: Đảm bảo khi bắt đầu kéo thẻ, sự kiện `dragstart` sẽ dừng lại ngay tại thẻ và không kích hoạt sự kiện kéo cột trên `BoardColumn`.
  - `onDragEnd`: Đảm bảo sự kiện kết thúc kéo thẻ không truyền lên cột.

### Đoạn mã thay đổi trong [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx):
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
      ...
```
