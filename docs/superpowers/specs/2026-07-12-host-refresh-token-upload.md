# Spec: Lưu trữ tệp tin tập trung bằng Refresh Token của Host

Tài liệu này đặc tả kỹ thuật cho giải pháp xác thực backend Next.js sử dụng Refresh Token của Host. Luồng này giúp tải file nhị phân trực tiếp lên Drive cá nhân của Host, sử dụng quota của Host và không bắt người dùng cuối đăng nhập.

## 1. Cơ chế xác thực (Authentication Mechanism)
- Khi người dùng gửi tệp tin nhị phân tới `/api/attachments/upload`:
  1. Backend đọc `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, và `GOOGLE_REFRESH_TOKEN` từ biến môi trường.
  2. Backend gửi yêu cầu POST đến endpoint token của Google: `https://oauth2.googleapis.com/token`.
  3. Nhận về `access_token` tạm thời có hiệu lực trong 1 giờ.
  4. Thực hiện upload tệp tin nhị phân bằng `access_token` này.
- Vì tệp tin được upload dưới danh nghĩa tài khoản chính chủ của Host (Refresh Token đại diện cho Host), Google Drive API sẽ:
  - Cho phép ghi tệp thành công, trừ vào quota 15GB của Host.
  - Tự động lưu tệp vào thư mục `GOOGLE_DRIVE_FOLDER_ID` do Host chỉ định.

---

## 2. Các thông số cấu hình mới (.env.local)
- `GOOGLE_CLIENT_ID`: Client ID của ứng dụng OAuth 2.0.
- `GOOGLE_CLIENT_SECRET`: Khóa bí mật (Client Secret) của ứng dụng OAuth 2.0.
- `GOOGLE_REFRESH_TOKEN`: Mã làm mới (Refresh Token) thu được sau khi chủ tài khoản Drive cấp quyền cho ứng dụng.
- `GOOGLE_DRIVE_FOLDER_ID`: ID thư mục lưu trữ tập trung của bạn.
