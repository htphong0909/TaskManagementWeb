# Google Drive API Setup Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hướng dẫn từng bước thiết lập dự án trên Google Cloud Console, tạo các API credentials cần thiết, cấu hình tệp môi trường `.env.local` và kiểm chứng việc kết nối Google Drive Picker thật vào ứng dụng.

**Architecture:** 
- **Google Cloud Platform:** Tạo dự án mới, kích hoạt APIs (Google Picker & Drive API), cấu hình OAuth consent screen.
- **Credentials:** Tạo OAuth 2.0 Client ID và API Key có giới hạn nguồn gốc xuất xứ (Origin Restrictions).
- **Environment:** Cấu hình biến môi trường trong tệp `.env.local`.

---

### Task 1: Thiết lập Project trên Google Cloud Console

**Files:**
- Create: `docs/superpowers/plans/2026-07-12-google-drive-api-setup-guide.md` (Tài liệu này)

- [ ] **Step 1: Truy cập Google Cloud Console**
  - Mở trình duyệt và truy cập [Google Cloud Console](https://console.cloud.google.com/).
  - Đăng nhập bằng tài khoản Google cá nhân của bạn.

- [ ] **Step 2: Tạo dự án mới (New Project)**
  - Nhấp vào menu chọn dự án ở thanh trên cùng và chọn **New Project** (Dự án mới).
  - Đặt tên cho dự án (ví dụ: `Task Management Web App`).
  - Nhấp **Create** và chờ dự án khởi tạo xong, sau đó chuyển sang dự án vừa tạo.

- [ ] **Step 3: Lấy Project Number (App ID)**
  - Tại trang **Dashboard** của dự án vừa tạo, tìm mục **Project Info** (Thông tin dự án).
  - Copy giá trị **Project number** (Mã số dự án). Đây chính là `NEXT_PUBLIC_GOOGLE_APP_ID`.

---

### Task 2: Kích hoạt các API dịch vụ Google Drive và Google Picker

**Files:**
- N/A

- [ ] **Step 1: Kích hoạt Google Drive API**
  - Đi tới thanh tìm kiếm trên cùng của Cloud Console, gõ tìm **Google Drive API**.
  - Nhấp vào **Google Drive API** từ danh sách kết quả và nhấn nút **Enable** (Kích hoạt).

- [ ] **Step 2: Kích hoạt Google Picker API**
  - Tiếp tục gõ tìm kiếm **Google Picker API** trên thanh công cụ.
  - Chọn **Google Picker API** và nhấn nút **Enable** (Kích hoạt).

---

### Task 3: Cấu hình Màn hình đồng ý OAuth (OAuth Consent Screen)

**Files:**
- N/A

- [ ] **Step 1: Tạo OAuth Consent Screen**
  - Trong thanh menu điều hướng bên trái (Navigation Menu), chọn **APIs & Services** > **OAuth consent screen**.
  - Chọn **User Type** là **External** (Ngoài tổ chức) và nhấp **Create**.

- [ ] **Step 2: Điền thông tin cơ bản của App**
  - Điền các thông tin bắt buộc:
    - **App name:** `Pastel Task App`
    - **User support email:** Địa chỉ email của bạn
    - **Developer contact information:** Địa chỉ email của bạn
  - Nhấn **Save and Continue** (Lưu và tiếp tục).

- [ ] **Step 3: Thêm phạm vi quyền hạn (Scopes)**
  - Nhấp vào nút **Add or Remove Scopes**.
  - Tìm và thêm scope sau đây để cho phép ứng dụng đọc danh sách file trong Drive:
    - `https://www.googleapis.com/auth/drive.readonly` (Xem tệp trong Google Drive của bạn mà bạn đã mở hoặc tạo bằng ứng dụng này)
  - Cuộn xuống dưới và nhấn **Update** để xác nhận, sau đó nhấn **Save and Continue**.

- [ ] **Step 4: Thêm tài khoản Test (Test Users)**
  - Vì ứng dụng ở trạng thái phát triển (Testing), bạn cần thêm email Google của chính bạn vào danh sách để có thể đăng nhập test.
  - Nhấp vào **Add Users**, điền email Google của bạn và nhấp **Add**.
  - Nhấn **Save and Continue** và xem lại tóm tắt cấu hình.

---

### Task 4: Tạo thông tin xác thực Credentials (Client ID & API Key)

**Files:**
- N/A

- [ ] **Step 1: Tạo OAuth 2.0 Client ID**
  - Từ menu bên trái, chọn **APIs & Services** > **Credentials**.
  - Nhấp vào nút **+ Create Credentials** ở trên cùng và chọn **OAuth client ID**.
  - Chọn **Application type** là **Web application**.
  - Điền tên: `Task App Web Client`.
  - Cuộn xuống phần **Authorized JavaScript origins** (Nguồn gốc JavaScript được ủy quyền):
    - Nhấp **+ Add URI** và điền URI chạy thử cục bộ của dự án: `http://localhost:3000` (hoặc cổng cụ thể của dev server của bạn).
  - Nhấp **Create**.
  - Hộp thoại hiển thị thông báo tạo thành công, copy giá trị **Client ID** của bạn. Đây chính là `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

- [ ] **Step 2: Tạo API Key**
  - Nhấp vào nút **+ Create Credentials** một lần nữa và chọn **API key**.
  - Hệ thống sẽ tạo và hiển thị khóa API Key mới, copy giá trị này. Đây chính là `NEXT_PUBLIC_GOOGLE_API_KEY`.
  - *(Khuyên dùng)* Nhấp vào khóa vừa tạo để thiết lập giới hạn (API restrictions):
    - Trong phần **API restrictions**, tích chọn **Restrict key**.
    - Chọn **Google Picker API** từ danh sách và nhấn **Save** để tránh khóa bị lạm dụng cho mục đích khác.

---

### Task 5: Cập nhật tệp môi trường ứng dụng và chạy thử nghiệm

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Điền thông tin vào tệp `.env.local`**

Tạo mới hoặc chỉnh sửa tệp `.env.local` ở thư mục gốc của dự án, điền 3 giá trị key bạn vừa thu thập được ở trên:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_API_KEY=your-api-key-here
NEXT_PUBLIC_GOOGLE_APP_ID=your-project-number-here
```

- [ ] **Step 2: Khởi động lại Server dự án**

Dừng server đang chạy (nếu có) và khởi động lại để Next.js nạp các biến môi trường mới:
```bash
npm run dev
```

- [ ] **Step 3: Xác minh đăng nhập & Picker hoạt động**
  - Truy cập đường dẫn không gian làm việc.
  - Hover chuột vào thẻ Card bất kỳ, di chuyển sang Popover chi tiết.
  - Nhấp vào nút **📎 Thêm đính kèm**.
  - Hệ thống sẽ mở ra cửa sổ đăng nhập Google Drive thật. Sau khi đăng nhập và cấp quyền, giao diện Picker sẽ hiển thị các file trong Drive của bạn để bạn chọn đính kèm.
