# Spec: Tải file lên và xem trực tiếp trên Google Drive cá nhân

Tài liệu này đặc tả thiết kế kỹ thuật cho việc hỗ trợ người dùng upload trực tiếp tệp tin từ máy tính cá nhân lên kho lưu trữ Google Drive của họ thông qua API và liên kết link xem trực tiếp đó vào thẻ Kanban.

## 1. Mở rộng quyền hạn xác thực (Google OAuth Scopes)
- Để ghi tệp mới vào Google Drive của người dùng, chúng ta cần bổ sung phạm vi quyền hạn OAuth 2.0:
  - Thêm scope: `https://www.googleapis.com/auth/drive.file`
- Phạm vi này cho phép ứng dụng:
  - Tạo mới các tệp tin trong Drive của người dùng.
  - Đọc/ghi các tệp được tạo bởi chính ứng dụng này (độ bảo mật cao nhất, không cần xin quyền truy cập toàn bộ Drive của khách).

---

## 2. Quy trình tải tệp trực tiếp lên Google Drive (REST API Upload)
Khi người dùng chọn một tệp tin cục bộ từ máy tính:
1. Yêu cầu Google OAuth cấp Token truy cập tạm thời (AccessToken).
2. Gửi một HTTP POST Request dạng `multipart/form-data` tới endpoint của Google Drive API:
   - URL: `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType`
   - Headers: `Authorization: Bearer <accessToken>`
   - Body: chứa siêu dữ liệu tệp (`metadata` dạng JSON: tên, loại tệp) và dữ liệu nhị phân của tệp (`file`).
3. Đặt quyền truy cập công khai (hoặc bất kỳ ai có link đều xem được) cho tệp vừa tạo bằng cách gửi POST Request tới permissions endpoint:
   - URL: `https://www.googleapis.com/drive/v3/files/<fileId>/permissions`
   - Body: `{ "role": "reader", "type": "anyone" }`
4. Lấy link xem trực tiếp `webViewLink` và tên file trả về từ Google, lưu vào bảng `attachments` của Supabase.

---

## 3. Cập nhật giao diện (UI/UX)
- **Thanh Đính Kèm mới trong CardPopover:**
  - Thay vì một nút chung chung, chia làm 2 nút bấm rõ rệt:
    - `📂 Chọn từ Drive`: Mở Google Picker chọn file có sẵn trên Drive.
    - `📤 Tải lên Drive`: Mở File Dialog chọn file từ máy tính để upload thẳng lên Google Drive.
- **Trạng thái tải lên (Uploading State):**
  - Hiển thị thanh tiến trình hoặc biểu tượng spinner xoay tròn (`isUploading`) kèm chữ "Đang tải lên Google Drive..." để thông báo cho người dùng trong suốt quá trình upload.
- **Chế độ mô phỏng (Mock Upload Fallback):**
  - Nếu thiếu API Keys cấu hình, khi chọn file từ máy tính, ứng dụng sẽ chạy hiệu ứng giả lập tải lên trong 1.5 giây (hiện tiến trình nạp %) rồi lưu một liên kết Google Drive mô phỏng để test luồng hoàn chỉnh.
