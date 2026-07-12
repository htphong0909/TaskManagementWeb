# Hướng dẫn chi tiết lấy Google Refresh Token cho Host

Tài liệu này hướng dẫn người host (chủ tài khoản Google Drive) cách lấy mã **Refresh Token** bằng Google OAuth Playground để cấu hình ứng dụng tải file trực tiếp lên Drive cá nhân.

---

### Bước 1: Tạo OAuth 2.0 Credentials trên Google Cloud Console
Nếu bạn chưa có Client ID và Client Secret:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) và mở dự án của bạn.
2. Từ menu bên trái, chọn **APIs & Services** > **Credentials**.
3. Nhấp vào **+ Create Credentials** > **OAuth client ID**.
4. Chọn **Application type** là **Web application**.
5. Nhập tên (ví dụ: `Task App Uploader`).
6. Cuộn xuống phần **Authorized redirect URIs** (URI chuyển hướng được ủy quyền):
   - Nhấp nút **+ Add URI**.
   - Dán chính xác địa chỉ chuyển hướng của Google OAuth Playground:
     ```text
     https://developers.google.com/oauthplayground
     ```
7. Nhấn **Create** để hoàn tất.
8. Một cửa sổ hiện lên hiển thị thông tin xác thực. Hãy copy:
   - **Client ID** (định dạng `...apps.googleusercontent.com`)
   - **Client Secret** (Khóa bí mật)

---

### Bước 2: Thiết lập Google OAuth Playground
1. Truy cập trang công cụ: [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Nhấp vào biểu tượng **bánh răng cấu hình (OAuth 2.0 Configuration)** ở góc trên cùng bên phải.
3. Trong bảng cấu hình:
   - Tích chọn **Use your own OAuth credentials** (Sử dụng thông tin xác thực OAuth của riêng bạn).
   - Điền **OAuth Client ID** và **OAuth Client Secret** bạn vừa copy ở Bước 1 vào các ô tương ứng.
   - Nhấn **Close** để đóng bảng.

---

### Bước 3: Xác thực tài khoản Google Drive
1. Ở cột bên trái, tại **Step 1: Select & authorize APIs**:
   - Nhấp vào ô nhập custom scope ở dưới cùng của danh sách (ô có chữ *Input your own scopes*).
   - Dán chính xác phạm vi quyền hạn ghi file sau:
     ```text
     https://www.googleapis.com/auth/drive.file
     ```
   - Nhấn nút **Authorize APIs** (màu xanh dương).
2. Google sẽ chuyển bạn đến trang đăng nhập tài khoản Google:
   - Chọn tài khoản Google (Gmail) của bạn - đây sẽ là tài khoản chứa Drive lưu file.
   - Nếu có cảnh báo *Google hasn't verified this app*, chọn **Advanced** > **Go to ... (unsafe)**.
   - Nhấn **Continue** (Tiếp tục) để đồng ý cấp quyền truy cập Drive cho ứng dụng của bạn.

---

### Bước 4: Đổi mã Authorization Code lấy Refresh Token
1. Trình duyệt sẽ chuyển hướng bạn quay lại trang OAuth Playground tại **Step 2: Exchange authorization code for tokens**.
2. Ô **Authorization code** sẽ tự động được điền mã code của bạn.
3. Nhấp vào nút **Exchange authorization code for tokens** (màu xanh dương).
4. Nhìn sang phần kết quả hiển thị bên dưới, bạn sẽ thấy trường **Refresh token**.
5. Copy chính xác giá trị của **Refresh token** này.

---

### Bước 5: Cấu hình tệp môi trường `.env.local`
Mở file `.env.local` ở thư mục gốc của dự án và điền các giá trị bạn vừa thu thập được ở trên (thay thế các khóa Service Account cũ):

```env
# 1. Next.js API credentials
GOOGLE_CLIENT_ID=your-client-id-from-step-1.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-from-step-1
GOOGLE_REFRESH_TOKEN=your-refresh-token-from-step-4

# 2. Thư mục Google Drive cá nhân của bạn để lưu file đính kèm
GOOGLE_DRIVE_FOLDER_ID=1wYGQkObrI1cL3xg4e8qtEfY3nSG2roPw
```
*(Lưu ý: Tệp `.env.local` được cấu hình cục bộ và đã được đưa vào .gitignore nên sẽ không bị lộ lên Github).*
