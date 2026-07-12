# Spec: Bảng thông tin chi tiết của Thẻ & Tích hợp Google Drive Picker

Tài liệu này đặc tả thiết kế kỹ thuật cho việc nâng cấp bảng thông tin chi tiết thẻ (Popover) thành một bảng tương tác, hỗ trợ sửa mô tả trực tiếp bằng Markdown, hiển thị file đính kèm từ Google Drive qua Google Picker API và cơ chế kết nối hover (Hover Bridge).

## 1. Thiết kế Tương tác Hover (Hover Bridge UX)
- Tránh việc Popover biến mất đột ngột khi người dùng di chuyển chuột từ Thẻ sang Popover.
- Sử dụng cơ chế trì hoãn đóng (debound delay) 200ms bằng `setTimeout`.
- Lắng nghe sự kiện `onMouseEnter` trên Popover để xóa bỏ bộ đếm thời gian hủy, giữ Popover luôn hiển thị khi tương tác bên trong.

---

## 2. Soạn thảo Mô tả trực tiếp (Inline Markdown Editor)
- Trạng thái hiển thị (Read Mode):
  - Biên dịch chuỗi văn bản Markdown thô thành HTML bằng trình biên dịch Regex cục bộ hỗ trợ:
    - **Bold**, *Italics*
    - Tiêu đề `# H1`, `## H2`, `### H3`
    - Dấu đầu dòng `- Danh sách`
    - Khối mã ```mã```
- Trạng thái chỉnh sửa (Edit Mode):
  - Chuyển đổi phần text thành thẻ `<textarea>` tự động focus.
  - Phím nóng `Ctrl + Enter` để lưu nhanh, phím `Esc` hoặc nút hủy để trở về Read Mode.
  - Lưu nội dung cập nhật vào cột `content` của bảng `cards`.

---

## 3. Quản lý File Đính kèm (Attachments)
- Tạo bảng `attachments` trong cơ sở dữ liệu để lưu thông tin file:
  - `id`: UUID (Primary Key)
  - `card_id`: UUID (Foreign Key references `cards(id)` ON DELETE CASCADE)
  - `name`: TEXT (Tên file)
  - `url`: TEXT (Link Drive xem/tải file)
  - `file_id`: TEXT (Google Drive File ID)
  - `mime_type`: TEXT (Mime type để hiện icon phù hợp)
- Vị trí hiển thị: Hiển thị ngay dưới tiêu đề của Card Popover, liệt kê dạng danh sách hàng ngang hoặc dọc. Có icon tương ứng với loại file (Hình ảnh, PDF, Văn bản...) và nút xóa file `🗑`.

---

## 4. Tích hợp Google Picker API & Google Drive
- Load SDK động từ Google:
  - `https://apis.google.com/js/api.js` (gapi)
  - `https://accounts.google.com/gsi/client` (gis)
- Sử dụng OAuth Client ID để lấy token truy cập tạm thời, mở cửa sổ Google Picker chọn tệp từ Drive.
- **Cơ chế Developer Fallback (Mock Picker Mode):**
  - Nếu thiếu cấu hình biến môi trường (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_API_KEY`), hệ thống sẽ hiển thị một thông báo hướng dẫn cách cấu hình trong tệp `.env.local`.
  - Cung cấp tính năng **Mô phỏng Drive (Mock Drive)**: Cho phép mở một pop-up giả lập hiển thị các tệp mẫu Google Drive để test luồng đính kèm, lưu trữ DB và xóa hoàn chỉnh.
