# Spec - Khắc Phục Lỗi Kéo Thẻ Đáy Cột Và Hoạt Ảnh Preview Kéo Thả

## 1. Vấn đề hiện tại
- **Kéo xuống đáy cột:** Khi kéo thẻ xuống vùng trống ở đáy cột, thẻ không được đẩy xuống cuối cùng vì container danh sách thẻ trong cột không có bộ xử lý sự kiện `onDragOver` cho card container.
- **Độ trễ khi kéo thả preview:** Class `transition-all duration-150` được áp dụng liên tục trên Card tạo ra độ trễ chuyển dịch layout khi tráo đổi thẻ trong thời gian thực, dẫn đến cảm giác kéo bị nặng và phải kéo sâu xuống mới kích hoạt đổi chỗ.

---

## 2. Thiết kế chi tiết đề xuất

### Cập nhật cấu trúc `BoardColumn.tsx`
- Bổ sung prop `onCardDragOverListContainer` vào giao diện `BoardColumnProps`.
- Đăng ký sự kiện `onDragOver` cho thẻ container chứa danh sách card:
```tsx
<div 
  className="space-y-3 flex-1 overflow-y-auto mb-3 pr-1 min-h-[50px] pt-1"
  onDragOver={(e) => {
    e.preventDefault();
    onCardDragOverListContainer(e, list.id);
  }}
>
```

### Cập nhật `src/app/board/[id]/page.tsx`
- Định nghĩa hàm `handleCardDragOverListContainer`:
```typescript
const handleCardDragOverListContainer = (e: React.DragEvent, listId: string) => {
  e.preventDefault();
  if (!activeDragCardId) return;

  const sourceIdx = cards.findIndex((c) => c.id === activeDragCardId);
  if (sourceIdx === -1) return;

  const sourceCard = cards[sourceIdx];
  const targetListCards = cards.filter((c) => c.list_id === listId && c.id !== activeDragCardId);

  const isAlreadyLastInTarget = 
    sourceCard.list_id === listId && 
    targetListCards.length > 0 && 
    cards.findIndex((c) => c.id === activeDragCardId) > cards.findIndex((c) => c.id === targetListCards[targetListCards.length - 1].id);

  if (!isAlreadyLastInTarget) {
    const updatedCards = [...cards];
    const [draggedCard] = updatedCards.splice(sourceIdx, 1);
    draggedCard.list_id = listId;

    let lastCardIdx = -1;
    for (let i = updatedCards.length - 1; i >= 0; i--) {
      if (updatedCards[i].list_id === listId) {
        lastCardIdx = i;
        break;
      }
    }

    if (lastCardIdx !== -1) {
      updatedCards.splice(lastCardIdx + 1, 0, draggedCard);
    } else {
      updatedCards.push(draggedCard);
    }

    setCards(updatedCards);
  }
};
```
- Truyền callback này vào phần render danh sách `<BoardColumn />`.

### Cập nhật `BoardCard.tsx`
- Tách thuộc tính transition: Chỉ kích hoạt `transition-all duration-150` khi thẻ không trong trạng thái kéo thả (`!isDragging`).

---

## 3. Kế hoạch xác minh (Verification Plan)
- **Kiểm thử thủ công:** Kéo thả thẻ từ trên xuống dưới đáy cột, kéo sang vùng trống cuối của cột khác và kiểm tra thứ tự có hoạt động mượt mà và lưu chính xác xuống cơ sở dữ liệu Supabase hay không.
- **Kiểm thử tự động:** Đảm bảo toàn bộ lệnh `npm run lint`, `npm run build` và `npm run test` đều vượt qua thành công.
