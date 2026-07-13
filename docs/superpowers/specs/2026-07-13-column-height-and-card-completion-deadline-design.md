# Spec - Tối Ưu Hóa Chiều Cao Cột & Tích Hợp Trạng Thái Hoàn Thành & Chỉnh Deadline

Tài liệu này đặc tả thiết kế kỹ thuật cho việc tối ưu bố cục chiều cao của cột công việc và bổ sung chức năng quản lý deadline, trạng thái hoàn thành công việc ở cả bảng chính và modal chi tiết.

---

## 1. Tối ưu hóa chiều cao cột (Board Column Height Alignment)

### Vấn đề
- Trang `page.tsx` của bảng đang sử dụng lớp CSS `h-screen` (100vh), tuy nhiên layout cha giới hạn vùng hiển thị chỉ ở `h-[92%]`, 8% còn lại dành cho thanh `BoardSwitcher`. Điều này khiến trang bị tràn xuống dưới và bị che lấp một phần đáy cột.
- Cột `BoardColumn` đang dùng lớp `max-h-[80vh]` làm cho chiều cao cột bị cố định, không tương thích tốt khi danh sách card quá nhiều dẫn đến nút thêm thẻ mới bị đẩy sâu xuống dưới.

### Giải pháp
- **Trang bảng chính ([page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx)):** Thay thế `h-screen` bằng `h-full`.
- **Cột công việc ([BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx)):** Thay thế `max-h-[80vh]` bằng `max-h-full` để cột co giãn động chính xác theo khoảng trống dọc còn lại.
- Nút "+ THÊM THẺ MỚI" nằm ngoài danh sách card (danh sách có `flex-1 overflow-y-auto`) nên sẽ luôn cố định ở đáy cột, nổi trên thanh switcher với khoảng cách an toàn `24px` (`p-6`).

---

## 2. Trạng thái Hoàn thành & Chỉnh sửa Deadline (Task Completion & Deadline Editing)

### Thiết kế Cơ sở dữ liệu
- Tạo file migration SQL: [20260713231651_add_is_completed_to_cards.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260713231651_add_is_completed_to_cards.sql)
  ```sql
  ALTER TABLE cards ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE;
  ```

### Thiết kế Thẻ công việc ([BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx))
- Bổ sung trường `is_completed: boolean` vào interface `Card`.
- Bổ sung prop: `onToggleComplete?: (cardId: string, isCompleted: boolean) => void`.
- **Checkbox hoàn thành:** Đặt ở bên trái tiêu đề thẻ. Khi nhấn vào checkbox, gọi `onToggleComplete` để cập nhật database và reload board. Tiêu đề thẻ **không** được gạch ngang hay thay đổi định dạng chữ/màu sắc khi hoàn thành.
- **Nhãn hạn chót (Deadline badge):**
  - Nếu `card.is_completed === true`: Hiển thị nhãn màu xanh lá mạ (`bg-emerald-50 text-emerald-600 border-emerald-100`) với định dạng text `Hoàn thành (HH:MM DD/MM)`. Không ghi kèm bất cứ trạng thái cảnh báo như "Quá hạn" hay "Sắp hết hạn".

### Thiết kế Modal Chi tiết ([CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx))
- Bổ sung trường `is_completed: boolean` vào interface `Card`.
- Khai báo các state quản lý:
  - `isCompleted` (boolean, đồng bộ từ `card.is_completed`)
  - `hasDeadline` (boolean, xác định thẻ có hạn chót hay không)
  - `dueDate` (string, lưu giá trị định dạng `YYYY-MM-DDTHH:mm` để binding vào input)
- **Tách bố cục Modal Body:**
  - Thay đổi Grid từ col-span-2 đơn lẻ thành bố cục 3 cột đầy đủ:
    - **Cột trái (`col-span-2`):** Mô tả, Chi tiết kế hoạch, Stakeholders, Key Info, File đính kèm.
    - **Cột phải (`col-span-1`):** Hộp cài đặt `📅 Hạn chót & Trạng thái`:
      - **Hoàn thành:** Checkbox trạng thái `Hoàn thành`. Tích chọn để đổi trạng thái của card thông qua hàm `saveField("is_completed", value)`.
      - **Bật hạn chót (Deadline):** Checkbox để kích hoạt/vô hiệu hóa hạn chót.
        - Khi bật: Hiển thị `<input type="datetime-local">` chỉnh ngày giờ, lưu tự động qua `saveField("due_date", isoString)`.
        - Khi tắt: Ẩn input ngày giờ và cập nhật `due_date = null` trong DB.
