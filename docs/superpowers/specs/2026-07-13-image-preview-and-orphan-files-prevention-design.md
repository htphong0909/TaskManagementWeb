# Design Spec: Thiết kế Next.js API Proxy Cho Ảnh Drive & Tối Ưu Hóa Giao Diện Modal, Popover

Bản đặc tả thiết kế chi tiết để giải quyết triệt để lỗi không hiển thị hình ảnh từ Google Drive bằng cơ chế Server-side Proxy, cùng các tối ưu hóa giao diện (auto-resize mô tả & chi tiết khi chuyển tab, giới hạn chiều cao popover, ngắt dòng liên kết URL dài, đồng bộ Markdown cho mô tả công việc ở cả Modal và Popover, và tăng tốc độ hiển thị popover).

---

## 1. Thành phần và Kiến trúc

### 1.1 API Proxy hình ảnh (`/api/attachments/proxy`)
- **Mục tiêu:** Cung cấp link ảnh trung gian từ server Next.js để trình duyệt tải trực tiếp, không qua domain Google Drive nhằm tránh bị chặn cookie.
- **Nguyên lý:**
  - Nhận tham số `fileId` từ query string.
  - Sử dụng Google OAuth credentials ở phía server (Refresh Token) để lấy Access Token.
  - Gọi API Google Drive lấy file nhị phân: `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`.
  - Stream dữ liệu file nhị phân về trình duyệt kèm `Content-Type` thích hợp và cấu hình cache client `Cache-Control`.
- **Cấu trúc URL mới trong Markdown:** `/api/attachments/proxy?fileId={fileId}`

### 1.2 Đồng bộ hóa 2 Bộ Soạn thảo Markdown & Auto-save trong Modal
- Cả **Mô tả công việc** và **Chi tiết công việc** trong Modal đều dùng chung thiết kế soạn thảo:
  - Có thanh công cụ (Toolbar) chứa nút chèn ảnh và hướng dẫn dán/kéo thả.
  - Tích hợp sự kiện paste ảnh từ clipboard (`paste`) và upload ảnh để lưu vào danh sách File đính kèm.
  - Có nút chuyển đổi Soạn thảo / Xem trước (mặc định cả Mô tả và Chi tiết đều mở Xem trước khi Modal mở lên).
- Áp dụng cơ chế **Auto-resize** tự co giãn chiều cao cho cả 2 textarea (`descRef` cho Mô tả, `textareaRef` cho Chi tiết) dựa trên `scrollHeight` và sự thay đổi của tab hiện tại (`isDescPreview` & `isPreviewMode`). Khi chuyển sang chế độ Soạn thảo, textarea lập tức co giãn để hiển thị đầy đủ văn bản mà không có thanh cuộn nội bộ.

### 1.3 Giới hạn chiều cao, định vị và tăng tốc hiển thị Popover (Card Hover Popover)
- **Mục tiêu:** Ngăn không cho Popover của thẻ hiển thị tràn xuống dưới cạnh màn hình gây mất nội dung, đồng thời hiển thị và đóng tức thì.
- **Nguyên lý:**
  - Cập nhật CSS class của Popover trong [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx), đặt `max-h-[80vh] overflow-y-auto` để tự xuất hiện thanh cuộn dọc khi Popover quá dài.
  - Tự động mọc ngược lên (`grow upwards`) sử dụng `bottom` khi card ở nửa dưới màn hình (`isLowerHalf = true`).
  - **Tăng tốc phản hồi (Fast Response):** Loại bỏ lớp transition chậm chạp `transition-all duration-200` khỏi Popover. Rút ngắn thời gian timeout chờ đóng từ `200ms` xuống `100ms` trong [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx).

### 1.4 Khắc phục lỗi tràn chữ có chọn lọc (Selective Word Wrap / URL Break All)
- **Mục tiêu:** Bẻ dòng triệt để cho các liên kết URL dài mà không xẻ đôi từ ngữ thông thường.
- **Nguyên lý:**
  - Áp dụng bẻ dòng thông thường theo từ (`word-break: break-word`) cho chữ văn bản thông thường và các `textarea`.
  - Chỉ áp dụng bẻ dòng triệt để (`word-break: break-all`) cho thẻ liên kết `<a>` trong phần Preview Markdown.

---

## 2. Luồng xử lý và Tương tác (Sequence & Data Flow)

```mermaid
sequenceDiagram
    participant Browser as Trình duyệt (Client)
    participant Server as Next.js Server
    participant DB as Supabase CSDL
    participant Drive as Google Drive API

    Browser->>Server: Tải ảnh lên (Upload file)
    Server->>Drive: Tải tệp lên Drive bằng Refresh Token
    Drive-->>Server: Trả về fileId và metadata
    Server-->>Browser: Trả về { fileId, mimeType, name }
    
    Browser->>DB: Lưu tệp đính kèm mới với URL = /api/attachments/proxy?fileId={fileId}
    Browser->>DB: Lưu chi tiết Markdown có chứa ![](URL proxy)
    
    Note over Browser, Drive: Khi người dùng xem Preview (Tải ảnh)
    Browser->>Server: GET /api/attachments/proxy?fileId={fileId}
    Server->>Drive: GET /files/{fileId}?alt=media
    Drive-->>Server: Trả về Binary Data và Content-Type
    Server-->>Browser: Phản hồi ảnh nhị phân với Header cache và Content-Type
```

---

## 3. Kế hoạch kiểm thử & Xác minh
- **Kiểm thử Preview ảnh:** Biên tập chi tiết/mô tả công việc, tải ảnh lên, kiểm tra xem hình ảnh hiển thị bình thường.
- **Kiểm thử độ nhạy Popover:** Rê chuột vào/ra các card và kiểm tra popover xuất hiện/biến mất nhanh nhạy, không còn cảm giác trễ hay có độ trễ mờ dần.
- **Kiểm thử ngắt dòng:** Nhập văn bản tiếng Việt bình thường (không bị xẻ đôi từ) và dán link URL siêu dài (link URL tự động ngắt dòng chính xác).
