# Hướng dẫn Thiết lập Google Service Account (Host Setup)

Tài liệu này hướng dẫn người host cách cấu hình Google Service Account (Tài khoản dịch vụ) và chia sẻ thư mục Drive để hệ thống tải file đính kèm của người dùng thẳng lên Google Drive của Host.

---

### Bước 1: Tạo Google Service Account
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) và chọn dự án của bạn.
2. Từ thanh menu điều hướng bên trái, chọn **IAM & Admin** > **Service Accounts**.
3. Nhấp vào nút **+ Create Service Account** ở thanh công cụ phía trên.
4. Nhập thông tin:
   - **Service account name:** `Kanban Drive Uploader`
   - **Service account ID:** Tự động điền theo tên.
5. Nhấp **Create and Continue**.
6. Mục **Grant this service account access to project** (Phân quyền): Bỏ qua (không bắt buộc) và nhấn **Continue**.
7. Nhấn **Done** để hoàn tất tạo tài khoản dịch vụ.
8. Ở danh sách Service Accounts, bạn sẽ thấy email robot mới được tạo (ví dụ: `kanban-drive-uploader@project-name.iam.gserviceaccount.com`). **Hãy copy địa chỉ email này**.

---

### Bước 2: Tạo và tải về Private Key JSON
1. Trong danh sách Service Accounts, nhấp vào địa chỉ email vừa tạo.
2. Chuyển sang tab **Keys** (Khóa) ở menu phía trên.
3. Nhấp chọn **Add Key** > **Create new key**.
4. Chọn định dạng khóa là **JSON** và nhấn **Create**.
5. Trình duyệt sẽ tự động tải xuống tệp tin `.json` chứa thông tin bảo mật của Service Account. **Hãy giữ tệp tin này cực kỳ cẩn thận**.

---

### Bước 3: Tạo thư mục Drive lưu trữ và chia sẻ quyền
1. Mở **Google Drive** của bạn (Tài khoản cá nhân của Host).
2. Tạo một thư mục mới và đặt tên (ví dụ: `Pastel Kanban Attachments`).
3. Nhấp chuột phải vào thư mục đó, chọn **Share** (Chia sẻ).
4. Dán địa chỉ email của **Service Account** (copy được ở Bước 1) vào ô mời thành viên.
5. Đảm bảo vai trò phân quyền là **Editor** (Người chỉnh sửa) để robot có quyền ghi file.
6. Bỏ tích chọn *Notify people* (để tránh lỗi thông báo email robot) và nhấn **Share** (hoặc **Send**).
7. Mở thư mục vừa tạo và copy chuỗi kí tự ID thư mục nằm ở cuối URL trên thanh địa chỉ trình duyệt của bạn (ví dụ: `https://drive.google.com/drive/folders/1A2B3C4D5E6F...` thì ID là `1A2B3C4D5E6F...`). Đây chính là `GOOGLE_DRIVE_FOLDER_ID`.

---

### Bước 4: Cập nhật tệp cấu hình `.env.local`
Mở file JSON vừa tải về ở Bước 2 bằng text editor, lấy các giá trị tương ứng và điền vào tệp `.env.local` ở thư mục gốc dự án:

```env
# 1. Email của Service Account (lấy từ trường "client_email" trong file JSON)
GOOGLE_SERVICE_ACCOUNT_EMAIL=kanban-drive-uploader@project-name.iam.gserviceaccount.com

# 2. Khóa riêng tư của Service Account (lấy từ trường "private_key" trong file JSON)
# Lưu ý: Cần bọc khóa trong dấu nháy kép để giữ nguyên các kí tự xuống dòng \n
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8...\n-----END PRIVATE KEY-----\n"

# 3. ID thư mục Drive của Host đã chia sẻ quyền Editor cho Service Account (lấy ở Bước 3)
GOOGLE_DRIVE_FOLDER_ID=1A2B3C4D5E6F...
```
