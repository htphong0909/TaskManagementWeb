# Spec - Tối Ưu Hóa Chiều Cao Cột & Tích Hợp Trạng Thái Hoàn Thành & Chỉnh Deadline (Refined)

Tài liệu này đặc tả thiết kế kỹ thuật cho việc tối ưu bố cục chiều cao của cột công việc và bổ sung chức năng quản lý deadline, trạng thái hoàn thành công việc ở modal chi tiết, đồng thời đồng bộ hiển thị trực quan ra thẻ card ngoài bảng chính.

---

## 1. Tối ưu hóa chiều cao cột (Board Column Height Alignment)

- **Trang bảng chính ([page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx)):** Thay thế `h-screen` bằng `h-full`.
- **Cột công việc ([BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx)):** Thay thế `max-h-[calc(100vh-140px)]` bằng `max-h-full` để cột co giãn động chính xác theo khoảng trống dọc còn lại.
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
- **Checkbox hoàn thành:** Không hiển thị checkbox hoàn thành trên thẻ BoardCard ngoài bảng chính. Việc check/uncheck trạng thái hoàn thành chỉ được thao tác bên trong Modal chi tiết thẻ.
- **Tiêu đề & Ngày tạo:**
  - Tiêu đề hiển thị bình thường (không bị gạch ngang).
  - Khi `card.is_completed === true`, hiển thị nhãn chữ **"Đã hoàn thành"** màu xanh lá mạ (`text-emerald-600 bg-emerald-50 border-emerald-100`) nằm kế bên phải của ngày tạo thẻ ở đầu card.
- **Nhãn hạn chót (Deadline badge):**
  - Nếu `card.is_completed === true`: Hiển thị nhãn màu xanh lá mạ (`bg-emerald-50 text-emerald-600 border border-emerald-100`) với định dạng text `Hoàn thành (HH:MM DD/MM)`. Không ghi kèm bất cứ trạng thái cảnh báo như "Quá hạn" hay "Sắp hết hạn".

### Thiết kế Modal Chi tiết ([CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx))
- Bổ sung trường `is_completed: boolean` vào interface `Card`.
- Khai báo các state quản lý:
  - `isCompleted` (boolean, đồng bộ từ `card.is_completed`)
  - `hasDeadline` (boolean, xác định thẻ có hạn chót hay không)
  - `dueDate` (string, lưu giá trị định dạng `YYYY-MM-DDTHH:mm` để định vị input)
- **Bố cục Modal Body:**
  - Grid 3 cột đầy đủ:
    - **Cột trái (`col-span-2`):** Mô tả, Chi tiết kế hoạch, Stakeholders, Key Info, File đính kèm.
      - **Bảo toàn chế độ soạn thảo khi mất focus hệ thống (Alt-Tab/Chuyển tab):** Cả 2 trình soạn thảo (Mô tả tóm tắt `content` và Chi tiết công việc `details`) khi mất nét (`onBlur`) cần kiểm tra trạng thái hoạt động của tài liệu qua `document.hasFocus()`. Nếu tài liệu mất nét do người dùng rời khỏi ứng dụng, không tự động chuyển về chế độ Preview để bảo toàn con trỏ và vị trí soạn thảo khi họ quay lại.
    - **Cột phải (`col-span-1`):** Hộp cài đặt `📅 Hạn chót & Trạng thái`:
      - **Hoàn thành:** Checkbox trạng thái `Hoàn thành`. Tích chọn để đổi trạng thái của card thông qua hàm `saveField("is_completed", value)`.
      - **Bật hạn chót (Deadline):** Checkbox để kích hoạt/vô hiệu hóa hạn chót.
        - Khi bật: Hiển thị `<input type="datetime-local">` chỉnh ngày giờ, lưu tự động qua `saveField("due_date", isoString)`.
        - Khi tắt: Ẩn input ngày giờ và cập nhật `due_date = null` trong DB.
