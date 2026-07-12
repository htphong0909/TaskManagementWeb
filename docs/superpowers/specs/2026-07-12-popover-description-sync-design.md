# Thiết kế: Đồng bộ mô tả chi tiết của Thẻ trong Popover

Tài liệu này đặc tả nguyên nhân và giải pháp kỹ thuật cho việc đồng bộ nội dung mô tả chi tiết của Thẻ khi người dùng tự động lưu bằng cách click ra ngoài (click-outside).

---

## 1. Phân tích nguyên nhân (Root Cause Analysis)

Khi người dùng chỉnh sửa mô tả chi tiết trong `CardPopover` và click ra ngoài:
1. Hàm `handleSaveDescription` được gọi để cập nhật dữ liệu mô tả mới lên Supabase.
2. Khi cập nhật thành công, popover gọi `onCardUpdated()`, tức là kích hoạt `fetchBoardData` tại `page.tsx` để tải lại danh sách các thẻ (`cards`).
3. Tuy nhiên, state `hoveredCard` (đang được truyền trực tiếp vào prop `card` của `CardPopover`) **vẫn giữ nguyên tham chiếu đến đối tượng thẻ cũ** (được lưu tại thời điểm di chuột vào thẻ).
4. Do `hoveredCard` không được cập nhật bằng dữ liệu mới tải về từ server, `CardPopover` vẫn nhận prop `card` cũ với mô tả chưa thay đổi. Vì vậy, khi đóng trình soạn thảo mô tả, Markdown view tiếp tục hiển thị nội dung cũ.

---

## 2. Giải pháp khắc phục (Synchronization Solution)

Chúng ta cần thực hiện đồng bộ ở cả hai phía: Component cha (`page.tsx`) và Component con (`CardPopover.tsx`):

### A. Đồng bộ phía Component Cha (`src/app/board/[id]/page.tsx`)
Thêm một `useEffect` để liên tục lắng nghe sự thay đổi của danh sách `cards`. Khi danh sách `cards` thay đổi (do tải lại từ server hoặc cập nhật lạc quan), nếu có một thẻ đang được mở Popover (`hoveredCard`), chúng ta tìm bản ghi mới nhất của thẻ đó trong `cards` và cập nhật lại `hoveredCard`:

```typescript
  // Đồng bộ hoveredCard với dữ liệu cards mới nhất
  useEffect(() => {
    if (hoveredCard) {
      const updated = cards.find((c) => c.id === hoveredCard.id);
      if (updated && updated !== hoveredCard) {
        setHoveredCard(updated);
      }
    }
  }, [cards, hoveredCard]);
```

### B. Đồng bộ phía Component Con (`src/components/CardPopover.tsx`)
Thêm một `useEffect` để đồng bộ lại state nội bộ `description` khi prop `card` (cụ thể là `card.content`) được cập nhật từ component cha:

```typescript
  // Đồng bộ lại nội dung mô tả khi prop card thay đổi từ bên ngoài
  useEffect(() => {
    setDescription(card.content || "");
  }, [card.id, card.content]);
```
