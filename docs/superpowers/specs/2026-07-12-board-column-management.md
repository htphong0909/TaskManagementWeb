# Spec: Quản lý Cột danh sách (Lists/Columns Management)

Tài liệu này đặc tả thiết kế kỹ thuật cho việc tạo cột, sửa tiêu đề cột trực tiếp (inline) và xóa cột kèm hộp thoại xác nhận.

## 1. Tạo cột mới (Create Column)
- Giao diện:
  - Hiển thị ở cuối cùng bên phải của danh sách các cột.
  - Kích thước cố định `min-w-[250px] w-[20vw]`.
  - Trạng thái chưa click: Thẻ nét đứt `+ Thêm danh sách`.
  - Trạng thái chỉnh sửa:
    - Hiển thị một ô `<input>` nhập tiêu đề danh sách.
    - Hai nút bấm: `Thêm danh sách` (nền tím, chữ trắng) và icon đóng `✕` để hủy.
- Logic:
  - Khi lưu, tính toán `position` bằng: `lists.length > 0 ? Math.max(...lists.map(l => l.position)) + 1000 : 1000`.
  - Gọi Supabase insert dòng mới vào bảng `lists`.
  - Tải lại dữ liệu workspace và tắt trạng thái chỉnh sửa.

---

## 2. Sửa tiêu đề cột trực tiếp (Inline Rename Column)
- Giao diện:
  - Tiêu đề cột bình thường hiển thị dưới dạng thẻ `<h3>`.
  - Khi người dùng click chuột vào tiêu đề:
    - Ẩn thẻ `<h3>`, hiển thị thẻ `<input>` thay thế.
    - Ô input có độ rộng khớp với khu vực tiêu đề, tự động focus.
  - Khi người dùng nhấn `Enter` hoặc click ra ngoài (`onBlur`):
    - Đóng chế độ chỉnh sửa, lưu tên mới lên Supabase.
    - Tải lại dữ liệu workspace để cập nhật giao diện.

---

## 3. Xóa cột (Delete Column)
- Giao diện:
  - Hiển thị một nút nhỏ có biểu tượng đóng `✕` (hoặc thùng rác `🗑`) ở góc phải của tiêu đề cột. Biểu tượng này ẩn mặc định và xuất hiện khi rê chuột (hover) vào vùng tiêu đề cột.
  - Khi click vào nút xóa:
    - Mở một hộp thoại xác nhận (Modal) dạng Glassmorphism căn giữa màn hình (được render qua React Portal).
    - Hiển thị tên cột cần xóa và cảnh báo việc xóa tất cả các thẻ Card bên trong cột.
- Logic:
  - Khi xác nhận xóa, gửi lệnh delete lên bảng `lists` của Supabase.
  - Các card liên kết trong bảng `cards` tự động bị xóa nhờ liên kết khóa ngoại CASCADE.
  - Tải lại dữ liệu workspace.
