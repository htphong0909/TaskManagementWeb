# Thiết kế: Ẩn Popover Chi Tiết Thẻ Khi Đang Kéo Thả (Hide Popover During Drag)

Tài liệu này đặc tả cơ chế ẩn Popover chi tiết thẻ khi người dùng bắt đầu thực hiện thao tác kéo thả thẻ hoặc kéo thả cột, đồng thời ngăn việc hiển thị Popover mới trong suốt quá trình kéo thả.

---

## 1. Phân tích vấn đề (Problem Analysis)

Hiện tại, khi di chuột qua các thẻ công việc, một Popover chi tiết (`CardPopover`) sẽ hiển thị để người dùng xem nhanh thông tin thẻ. Tuy nhiên:

1. Khi người dùng click giữ và kéo thẻ đi, Popover này vẫn hiển thị nguyên tại chỗ, đè lên các cột danh sách và gây cản trở tầm nhìn khi chọn vị trí thả thẻ.
2. Trong quá trình kéo thẻ (drag-in-progress), nếu chuột di qua các thẻ công việc khác, sự kiện `onMouseEnter` trên các thẻ đó vẫn được kích hoạt. Điều này mở ra các Popover mới liên tục, làm giật lag giao diện và che khuất các phần tử khác trên bảng công việc.

---

## 2. Giải pháp kỹ thuật (Technical Solution)

Chúng ta cần kiểm soát vòng đời hiển thị của Popover dựa trên trạng thái kéo thả (`activeDragCardId` và `activeDragListId`):

- **Đóng Popover ngay khi bắt đầu kéo:** Khi hàm `handleCardDragStart` hoặc `handleListDragStart` được gọi, chúng ta sẽ gán `hoveredCard = null` và `hoveredRect = null` để đóng Popover hiện tại ngay lập tức, đồng thời hủy bỏ mọi timeout đóng/mở Popover đang chờ.
- **Chặn kích hoạt Popover mới khi đang kéo thả:** Trong `handleCardMouseEnter`, chúng ta kiểm tra nếu `activeDragCardId` hoặc `activeDragListId` khác `null`, ta sẽ thoát sớm (`return`) mà không cập nhật state mở Popover.

### Các thay đổi cụ thể trong [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx):

- **Trong `handleCardDragStart` và `handleListDragStart`:**
  ```typescript
  setHoveredCard(null);
  setHoveredRect(null);
  if (closeTimeoutRef.current) {
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }
  ```

- **Trong `handleCardMouseEnter`:**
  ```typescript
  if (activeDragCardId || activeDragListId) return;
  ```
